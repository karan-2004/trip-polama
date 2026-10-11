import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage, Trip } from '@trailbrain/core';
import { chatWithTrip } from './chat';

afterEach(() => vi.unstubAllGlobals());
const history: ChatMessage[] = [{ id: 'm', sessionId: 's', role: 'user', content: 'Help me plan', ts: 1 }];
const config = { host: 'http://localhost:11434', model: 'test-model' };
describe('trip model conversation', () => {
  it('uses planner context before trip creation and validates the model reply', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ message: { content: JSON.stringify({ reply: 'Where?', actions: [] }) } }) });
    vi.stubGlobal('fetch', fetcher);
    const result = await chatWithTrip(history, null, config);
    expect(result.reply).toBe('Where?');
    const body = JSON.parse(fetcher.mock.calls[0]?.[1].body);
    expect(body.messages[0].content).toContain('"mode":"planner"');
    expect(body.format.properties.actions).toBeDefined();
    expect(body.options.temperature).toBe(0);
  });
  it('uses fresh manager state without sending exact location or image bytes', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ message: { content: '{"reply":"Ready","actions":[]}' } }) });
    vi.stubGlobal('fetch', fetcher);
    const trip: Trip = { id: 'trip', name: 'Trail', destination: 'Hills', startDate: '', endDate: '', currency: 'INR', members: ['A'],
      waypoints: [{ id: 'point', name: 'Camp', lat: 12.345678, lon: 98.765432, visited: false }], expenses: [],
      photos: [{ id: 'photo', filename: 'secret.jpg', image: new Blob(['private-image']), ts: 1 }], memberLocations: [], createdAt: 0, updatedAt: 0 };
    await chatWithTrip(history, trip, config);
    const body = fetcher.mock.calls[0]?.[1].body as string;
    expect(body).toContain('manager');
    expect(body).not.toContain('12.345678');
    expect(body).not.toContain('private-image');
    expect(body).not.toContain('secret.jpg');
  });
  it('rejects unrecognized actions without a fabricated fallback reply', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ message: { content: '{"reply":"Deleted","actions":[{"type":"delete_all"}]}' } }) }));
    await expect(chatWithTrip(history, null, config)).rejects.toThrow('invalid action');
  });
});
