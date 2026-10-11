import { afterEach, expect, it, vi } from 'vitest';
import type { Trip, ChatMessage } from '@trip-polama/core';
import { chatAsPlanner } from './onlinePlanner';
const history: ChatMessage[] = [{ id: 'm', sessionId: 's', role: 'user', content: 'Research the destination', ts: 1 }];
const trip: Trip = { id: 't', name: 'Trek', destination: 'Manali', startDate: '', endDate: '', currency: 'INR', members: ['A'],
  waypoints: [{ id: 'w', name: 'Ridge', lat: 12.123, lon: 34.567, visited: false, note: 'private waypoint note' }],
  expenses: [{ id: 'e', description: 'private expense', amount: 100, category: 'food', paidBy: 'A', splitAmong: ['A'], ts: 1 }],
  photos: [{ id: 'p', filename: 'private.jpg', image: new Blob(['image']), ts: 1 }],
  memberLocations: [], createdAt: 1, updatedAt: 1 };
afterEach(() => vi.unstubAllGlobals());
it('provides a clarification-oriented message for invalid model proposals without exposing diagnostics', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 502, json: async () => ({
    code: 'invalid_model_reply', requestId: 'internal-reference', error: 'Internal schema details',
  }) }));
  await expect(chatAsPlanner(history, null)).rejects.toThrow('Nothing was changed');
  await expect(chatAsPlanner(history, null)).rejects.not.toThrow('Internal schema details');
});
it('explains billing rejection without switching agents or retrying', async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 402 });
  vi.stubGlobal('fetch', fetcher);
  await expect(chatAsPlanner(history, null)).rejects.toThrow('service usage limit');
  expect(fetcher).toHaveBeenCalledOnce();
});
it('calls only the planner gateway with minimized structured data and source provenance', async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ answer: { reply: 'Research', actions: [] }, model: 'large', sources: [] }) });
  vi.stubGlobal('fetch', fetcher);
  await chatAsPlanner(history, trip);
  expect(fetcher.mock.calls[0]?.[0]).toBe('/api/planner/chat');
  const body = fetcher.mock.calls[0]?.[1].body;
  expect(body).toContain('Manali');
  expect(body).not.toContain('private expense');
  expect(body).not.toContain('12.123');
  expect(body).not.toContain('private.jpg');
  expect(body).not.toContain('private waypoint note');
});
it('reports missing planner configuration without local-model fallback', async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 503 });
  vi.stubGlobal('fetch', fetcher);
  await expect(chatAsPlanner(history, null)).rejects.toThrow('not available yet');
  expect(fetcher).toHaveBeenCalledOnce();
});
it('rejects manager-only writes returned by the planner', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ model: 'large', sources: [], answer: {
    reply: 'Expense', actions: [{ type: 'add_expense', description: 'Food', amount: 10, category: 'food', paidBy: 'A', splitAmong: ['A'] }],
  } }) }));
  await expect(chatAsPlanner(history, trip)).rejects.toThrow('manager-only');
});
