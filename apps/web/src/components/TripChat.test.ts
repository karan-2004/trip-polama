// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db, createPlanningChat, createTrip, ensureTripChat } from '@trip-polama/store';
import { chatAsPlanner, chatAsManager } from '@trip-polama/online-brain';
import { TripChat } from './TripChat';

vi.mock('@trip-polama/online-brain', () => ({ chatAsPlanner: vi.fn(), chatAsManager: vi.fn() }));
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
  it('reviews sourced stops in plain language and saves them as waypoints on confirmation', async () => {
    const session = await createPlanningChat();
    vi.mocked(chatAsPlanner).mockResolvedValue({ model: 'large', sources: [], spots: [{ id: 'wiki:2', name: 'Temple', lat: 32.01, lon: 77.01,
      sourceUrl: 'https://en.wikipedia.org/wiki/Temple', retrievedAt: '2026-10-11T12:00:00Z' }], answer: {
      reply: 'Here is your trip with a suggested stop.', actions: [{ type: 'create_trip', name: 'Trek', destination: 'Manali',
        startDate: '', endDate: '', currency: 'INR', members: ['A'], spotIds: ['wiki:2'] }],
    } });
    await act(async () => root.render(createElement(TripChat, { sessionId: session.id, onChanged: vi.fn(), onOpenManual: vi.fn() })));
    await eventually(() => container.textContent?.includes('New trip idea') ?? false);
    const textarea = container.querySelector('textarea')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(textarea, 'Create a trek in Manali');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => container.querySelector('.chat-composer')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    await eventually(() => container.textContent?.includes('Suggested stops to save') ?? false);
    expect(container.querySelector('pre')).toBeNull();
    expect(container.textContent).not.toContain('32.01');
    expect(container.textContent).toContain('Destination');
    expect(container.querySelector<HTMLInputElement>('input[type=checkbox]')?.checked).toBe(true);
    const confirm = [...container.querySelectorAll('button')].find((button) => button.textContent === 'Confirm change')!;
    await act(async () => confirm.click());
    await eventually(() => container.textContent?.includes('Your trip manager') ?? false);
    expect((await db.waypoints.toArray())[0]?.name).toBe('Temple');
  });
  it('executes read-only actions without confirmation and offers instant summary commands', async () => {
    const trip = await createTrip({ name: 'Trek', destination: 'Manali', startDate: '', endDate: '', currency: 'INR', members: ['A', 'B'] });
    const session = await ensureTripChat(trip.id);
    vi.mocked(chatAsManager).mockResolvedValue({ reply: 'Getting members.', actions: [{ type: 'read_trip', section: 'members' }] });
    await act(async () => root.render(createElement(TripChat, { sessionId: session.id, onChanged: vi.fn(), onOpenManual: vi.fn() })));
    await eventually(() => container.textContent?.includes('Your trip manager') ?? false);
    async function send(text: string) {
      const textarea = container.querySelector('textarea')!;
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(textarea, text);
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await act(async () => container.querySelector('.chat-composer')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    }
    await send('Who is on this trek?');
    await eventually(() => container.textContent?.includes('A, B') ?? false);
    expect([...container.querySelectorAll('button')].some((button) => button.textContent === 'Confirm change')).toBe(false);
    expect((await db.trips.get(trip.id))?.updatedAt).toBe(trip.updatedAt);
    vi.mocked(chatAsManager).mockClear();
    await send('summary');
    await eventually(() => container.textContent?.includes('Expenses: INR 0.00') ?? false);
    expect(chatAsManager).not.toHaveBeenCalled();
    expect(chatAsPlanner).not.toHaveBeenCalled();
  });
  it('attaches multiple photos directly to chat without sending them to either model', async () => {
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:photo'), revokeObjectURL: vi.fn() });
    const trip = await createTrip({ name: 'Trek', destination: '', startDate: '', endDate: '', currency: 'INR', members: [] });
    const session = await ensureTripChat(trip.id);
    await act(async () => root.render(createElement(TripChat, { sessionId: session.id, onChanged: vi.fn(), onOpenManual: vi.fn() })));
    await eventually(() => container.textContent?.includes('Your trip manager') ?? false);
    const input = container.querySelector<HTMLInputElement>('input[type=file]')!;
    expect(input.multiple).toBe(true);
    expect(container.querySelector('[aria-label="Add photos"]')).not.toBeNull();
    Object.defineProperty(input, 'files', { value: [new File(['a'], 'a.jpg', { type: 'image/jpeg' }), new File(['b'], 'b.jpg', { type: 'image/jpeg' })] });
    await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })));
    expect(container.textContent).toContain('Save 2 photos');
    await act(async () => container.querySelector('.chat-composer')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    await eventually(() => container.textContent?.includes('Added 2 photos') ?? false);
    expect(await db.photos.count()).toBe(2);
    expect(chatAsManager).not.toHaveBeenCalled();
    expect(chatAsPlanner).not.toHaveBeenCalled();
    expect((await db.photos.toArray())[0]).not.toHaveProperty('lat');
  });
  it('shows user-facing assistant guidance without developer setup or connection controls', async () => {
    const session = await createPlanningChat();
    await act(async () => root.render(createElement(TripChat, { sessionId: session.id, onChanged: vi.fn(), onOpenManual: vi.fn() })));
    await eventually(() => container.textContent?.includes('New trip idea') ?? false);
    const guidance = [...container.querySelectorAll('details')].find((item) => item.querySelector('summary')?.textContent === 'About your trip assistants')!;
    expect(guidance.textContent).toContain('Source links');
    expect(guidance.textContent).toContain('Private details you write in chat');
    for (const internal of ['PLANNER_', 'BRAVE_SEARCH_API_KEY', 'VITE_', 'server/.env', 'npm run', '/api/planner/chat', 'localhost:', 'HTTP 402']) {
      expect(container.textContent).not.toContain(internal);
    }
    expect(container.querySelector('#model-host')).toBeNull();
    expect(container.querySelector('#model-name')).toBeNull();
    expect(chatAsPlanner).not.toHaveBeenCalled();
    expect(chatAsManager).not.toHaveBeenCalled();
  });
  it('stays a planner until confirmation and becomes a persistent manager conversation', async () => {
    const session = await createPlanningChat();
    vi.mocked(chatAsPlanner).mockResolvedValue({ model: 'large-planner', sources: [], answer: { reply: 'Here is a trip proposal.', actions: [{
      type: 'create_trip', name: 'Weekend trek', destination: 'Manali', startDate: '', endDate: '', currency: 'INR', members: ['A'],
    }] } });
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
    expect(container.textContent).toContain('Completed');
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
    expect(chatAsManager).not.toHaveBeenCalled();
    expect(chatAsPlanner).not.toHaveBeenCalled();
  });
  it('routes existing trip chat locally and uses online replanning only after explicit switching', async () => {
    const trip = await createTrip({ name: 'Trek', destination: 'Manali', startDate: '', endDate: '', currency: 'INR', members: ['A'] });
    const session = await ensureTripChat(trip.id);
    vi.mocked(chatAsManager).mockResolvedValue({ reply: 'No expenses yet.', actions: [] });
    vi.mocked(chatAsPlanner).mockResolvedValue({ answer: { reply: 'Background research [1].', actions: [] }, model: 'larger-online-model',
      sources: [{ title: 'Manali', url: 'https://en.wikipedia.org/wiki/Manali', retrievedAt: '2026-10-11T12:00:00Z' }] });
    await act(async () => root.render(createElement(TripChat, { sessionId: session.id, onChanged: vi.fn(), onOpenManual: vi.fn() })));
    await eventually(() => container.textContent?.includes('Your trip manager') ?? false);
    async function send(text: string) {
      const textarea = container.querySelector('textarea')!;
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(textarea, text);
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await act(async () => container.querySelector('.chat-composer')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    }
    await send('Summarize my expenses');
    await eventually(() => container.textContent?.includes('No expenses yet.') ?? false);
    expect(chatAsManager).toHaveBeenCalledOnce();
    expect(chatAsPlanner).not.toHaveBeenCalled();
    const replan = [...container.querySelectorAll('button')].find((button) => button.textContent === 'Research / Replan online')!;
    await act(async () => replan.click());
    await eventually(() => container.textContent?.includes('Your trip planner') ?? false);
    await send('Research this destination');
    await eventually(() => !!container.querySelector('[aria-label="Research sources"]'));
    expect(chatAsPlanner).toHaveBeenCalledOnce();
    expect((await db.chatSessions.get(session.id))?.activeAgent).toBe('planner');
    const back = [...container.querySelectorAll('button')].find((button) => button.textContent === 'Return to local manager')!;
    await act(async () => back.click());
    await eventually(() => container.textContent?.includes('Your trip manager') ?? false);
    expect(container.textContent).toContain('Background research');
    expect(container.textContent).toContain('No expenses yet.');
  });
  it('does not escalate local manager failures to the online planner', async () => {
    const trip = await createTrip({ name: 'Trek', destination: '', startDate: '', endDate: '', currency: 'INR', members: ['A'] });
    const session = await ensureTripChat(trip.id);
    vi.mocked(chatAsManager).mockRejectedValue(new Error('Local model unavailable'));
    await act(async () => root.render(createElement(TripChat, { sessionId: session.id, onChanged: vi.fn(), onOpenManual: vi.fn() })));
    await eventually(() => container.textContent?.includes('Your trip manager') ?? false);
    const textarea = container.querySelector('textarea')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(textarea, 'Please explain the budget briefly');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => container.querySelector('.chat-composer')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    await eventually(() => container.textContent?.includes('Local model unavailable') ?? false);
    expect(chatAsPlanner).not.toHaveBeenCalled();
  });
});
