// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db, createPlanningChat, createTrip, ensureTripChat } from '@trailbrain/store';
import { chatWithTrip } from '@trailbrain/online-brain';
import { TripChat } from './TripChat';

vi.mock('@trailbrain/online-brain', () => ({ chatWithTrip: vi.fn() }));
let root: Root;
let container: HTMLDivElement;
beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  localStorage.clear();
  localStorage.setItem('trailbrain-chat-model', JSON.stringify({ host: 'http://localhost:11434', model: 'test-model' }));
  await db.open();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  await Promise.all(db.tables.map((table) => table.clear()));
  db.close();
  container.remove();
  localStorage.clear();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
async function eventually(condition: () => boolean) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (condition()) return;
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); });
  }
  throw new Error('Expected chat UI state did not appear.');
}

describe('chat-centered trip workflow', () => {
  it('stays a planner until confirmation and becomes a persistent manager conversation', async () => {
    const session = await createPlanningChat();
    vi.mocked(chatWithTrip).mockResolvedValue({ reply: 'Here is a trip proposal.', actions: [{
      type: 'create_trip', name: 'Weekend trek', destination: 'Manali', startDate: '', endDate: '', currency: 'INR', members: ['A'],
    }] });
    const props = { sessionId: session.id, onChanged: vi.fn(), onOpenManual: vi.fn() };
    await act(async () => root.render(createElement(TripChat, props)));
    await eventually(() => container.textContent?.includes('New trip idea') ?? false);
    expect(container.textContent).toContain('Your trip planner');
    const textarea = container.querySelector('textarea')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(textarea, 'Plan a weekend trek');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => container.querySelector('.chat-composer')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    await eventually(() => container.textContent?.includes('Confirm change') ?? false);
    expect(await db.trips.count()).toBe(0);
    const confirm = [...container.querySelectorAll('button')].find((button) => button.textContent === 'Confirm change')!;
    await act(async () => confirm.click());
    await eventually(() => container.textContent?.includes('Your trip manager') ?? false);
    expect(await db.trips.count()).toBe(1);
    expect(container.textContent).toContain('Trip activity');
    await act(async () => root.unmount());
    root = createRoot(container);
    await act(async () => root.render(createElement(TripChat, props)));
    await eventually(() => container.textContent?.includes('Weekend trek') ?? false);
    expect(container.textContent).toContain('Plan a weekend trek');
    expect(container.textContent).toContain('applied');
  });

  it('keeps manual tools accessible from an existing trip conversation', async () => {
    const trip = await createTrip({ name: 'Existing trek', destination: '', startDate: '', endDate: '', currency: 'INR', members: ['A'] });
    const session = await ensureTripChat(trip.id);
    const open = vi.fn();
    await act(async () => root.render(createElement(TripChat, { sessionId: session.id, onChanged: vi.fn(), onOpenManual: open })));
    await eventually(() => !!container.querySelector('[aria-label="Manual trip tools"]'));
    const button = [...container.querySelectorAll('button')].find((item) => item.textContent === 'expenses')!;
    await act(async () => button.click());
    expect(open).toHaveBeenCalledWith(trip.id, 'expenses');
    expect(chatWithTrip).not.toHaveBeenCalled();
  });
});
