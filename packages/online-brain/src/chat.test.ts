import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage, Trip } from '@trip-polama/core';
import { chatWithTrip, chatAsManager } from './chat';

afterEach(() => vi.unstubAllGlobals());
const history: ChatMessage[] = [{ id: 'm', sessionId: 's', role: 'user', content: 'Help me plan', ts: 1 }];
const config = { host: 'http://localhost:11434', model: 'test-model' };
describe('trip model conversation', () => {
  it('responds instantly to a known read command without a model call or confirmation', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    const trip: Trip = { id: 't', name: 'Trek', destination: 'Hills', startDate: '', endDate: '', currency: 'INR', members: ['A'],
      waypoints: [], expenses: [], photos: [], memberLocations: [], createdAt: 0, updatedAt: 0 };
    const answer = await chatAsManager([{ ...history[0]!, content: 'summary' }], trip, config);
    expect(answer.reply).toContain('Trek');
    expect(answer.actions).toEqual([]);
    expect(answer.localRead).toBe(true);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('executes model-selected reads on the complete local data without another inference or approval', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ message: { content: JSON.stringify({ reply: 'Reading', actions: [{ type: 'read_trip', section: 'members' }] }) } }) });
    vi.stubGlobal('fetch', fetcher);
    const trip: Trip = { id: 't', name: 'Trek', destination: '', startDate: '', endDate: '', currency: 'INR', members: ['A', 'B'],
      waypoints: [], expenses: [], photos: [], memberLocations: [], createdAt: 0, updatedAt: 0 };
    const answer = await chatAsManager(history, trip, config);
    expect(answer.reply).toBe('A, B');
    expect(answer.actions).toEqual([]);
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it('local manager uses compact context and cannot create a new trip', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ message: { content: '{"reply":"Summary","actions":[]}' } }) });
    vi.stubGlobal('fetch', fetcher);
    const trip: Trip = { id: 't', name: 'Trip', destination: 'Hills', startDate: '', endDate: '', currency: 'INR', members: [],
      waypoints: [], expenses: [], photos: [], memberLocations: [], createdAt: 0, updatedAt: 0 };
    await chatAsManager(history, trip, config);
    expect(fetcher.mock.calls[0]?.[0]).toBe('http://localhost:11434/api/chat');
    const body = JSON.parse(fetcher.mock.calls[0]?.[1].body);
    expect(body.options.num_predict).toBe(800);
    expect(body.messages[0].content).toContain('LOCAL trip manager');
    expect(JSON.stringify(body.format)).not.toContain('create_trip');
  });
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
