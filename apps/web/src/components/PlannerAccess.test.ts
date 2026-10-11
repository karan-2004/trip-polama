// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PlannerAccess } from './PlannerAccess';

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  localStorage.clear();
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
it('offers user-facing sign-in and sends a password only to the same-origin access route', async () => {
  const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ requiresSignIn: true, signedIn: false }) })
    .mockResolvedValueOnce({ ok: true });
  vi.stubGlobal('fetch', fetcher);
  await act(async () => root.render(createElement(PlannerAccess)));
  await act(async () => container.querySelector('button')!.click());
  const input = container.querySelector('input')!;
  expect(input.type).toBe('password');
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'demo-access-value');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await act(async () => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(fetcher.mock.calls[1]?.[0]).toBe('/api/session');
  expect(fetcher.mock.calls[1]?.[1].credentials).toBe('same-origin');
  expect(container.textContent).toContain('Online planning unlocked');
  expect(localStorage.length).toBe(0);
  expect(container.textContent).not.toContain('SESSION_SECRET');
});
it('prompts for access again after an expired-session signal', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ requiresSignIn: true, signedIn: true }) }));
  await act(async () => root.render(createElement(PlannerAccess)));
  expect(container.textContent).toContain('Online planning unlocked');
  await act(async () => window.dispatchEvent(new Event('planner-access-required')));
  expect(container.querySelector('input[type=password]')).not.toBeNull();
  expect(container.textContent).not.toContain('Online planning unlocked');
});
