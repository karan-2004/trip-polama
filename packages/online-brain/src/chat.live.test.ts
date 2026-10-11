import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage, Trip } from '@trip-polama/core';
import { chatAsManager } from './chat';

const enabled = process.env.RUN_LIVE_MODEL === '1';
const config = {
  host: process.env.OLLAMA_HOST || 'http://localhost:11434',
  model: process.env.OLLAMA_MODEL || 'llama3.2:3b',
};
function message(content: string): ChatMessage[] {
  return [{ id: 'test-message', sessionId: 'test-session', role: 'user', content, ts: 1 }];
}
const trip: Trip = {
  id: 'synthetic-trip', name: 'Manali weekend', destination: 'Manali',
  startDate: '2026-10-20', endDate: '2026-10-22', currency: 'INR', members: ['Alice', 'Bob'],
  waypoints: [{ id: 'ridge', name: 'Ridge viewpoint', lat: 32.25, lon: 77.2, visited: false }],
  expenses: [], photos: [], memberLocations: [], createdAt: 1, updatedAt: 1,
};
const populatedTrip: Trip = { ...trip, waypoints: [...trip.waypoints,
  { id: 'camp', name: 'Camp', lat: 32.24, lon: 77.19, visited: true }],
  expenses: Array.from({ length: 12 }, (_, index) => ({ id: `e${index}`, description: index === 0 ? 'Airport taxi' : `Meal ${index}`,
    amount: index === 0 ? 120 : 10, category: index === 0 ? 'transport' : 'food', paidBy: 'Alice', splitAmong: ['Alice', 'Bob'], ts: index + 1 })),
};

// Opt-in, synthetic context only. Tests validate proposals, never execute mutations.
describe.skipIf(!enabled)('live local Ollama manager', () => {
  let rawResponse = '';
  beforeEach(() => {
    rawResponse = '';
    const originalFetch = globalThis.fetch;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (...args) => {
      const response = await originalFetch(...args);
      const body = await response.clone().json() as { message?: { content?: string } };
      rawResponse = body.message?.content ?? '';
      return response;
    });
  });
  afterEach((context) => {
    // Synthetic test data only; expose rejected outputs for reproducible diagnosis.
    if (context.task.result?.state === 'fail') console.info('Rejected live output:', rawResponse);
    vi.restoreAllMocks();
  });
  it('summarizes a saved trip without making changes', async () => {
    const result = await chatAsManager(message('Briefly summarize this trip and the recorded expenses. Do not change anything.'), trip, config);
    console.info('Local manager summary:', JSON.stringify(result));
    expect(result.reply.length).toBeGreaterThan(0);
    expect(result.actions).toEqual([]);
  }, 100000);

  it('proposes an expense in manager mode without changing the trip', async () => {
    const result = await chatAsManager(message('Propose adding lunch costing 600 INR, category food, paid by Alice, split equally among Alice and Bob. Return exactly one add_expense proposal; do not claim it has already been recorded.'), trip, config);
    console.info('Manager expense:', JSON.stringify(result));
    expect(result.actions).toEqual([{ type: 'add_expense', description: expect.any(String), amount: 600,
      category: 'food', paidBy: 'Alice', splitAmong: ['Alice', 'Bob'] }]);
    expect(trip.expenses).toEqual([]);
  }, 100000);
  it('retrieves a complete summary from saved records without confirmation', async () => {
    const start = Date.now();
    const result = await chatAsManager(message('Retrieve a saved-trip summary including total spent, the group and remaining stops. Use read_trip section summary. Do not change anything or ask for approval.'), populatedTrip, config);
    console.info('Populated summary:', JSON.stringify(result), 'ms:', Date.now() - start);
    expect(result.reply).toContain('230');
    expect(result.reply).toContain('Alice');
    expect(result.reply).toContain('Bob');
    expect(result.actions).toEqual([]);
  }, 100000);
  it('retrieves an older expense outside the model snapshot via a local read tool', async () => {
    const result = await chatAsManager(message('Find the Airport taxi expense, even if it is older than the recent snapshot. Use read_trip section expenses and query Airport taxi. Do not change anything or ask for approval.'), populatedTrip, config);
    console.info('Older expense retrieval:', JSON.stringify(result));
    expect(result.reply).toContain('Airport taxi');
    expect(result.reply).toContain('120');
    expect(result.actions).toEqual([]);
  }, 100000);
  it('lists remaining stops with no write proposal', async () => {
    const result = await chatAsManager(message('Retrieve only the remaining unvisited stops. Use read_trip section waypoints, query remaining. No changes or approval.'), populatedTrip, config);
    console.info('Remaining stops:', JSON.stringify(result));
    expect(result.reply).toContain('Ridge');
    expect(result.reply).not.toContain('Camp: visited');
    expect(result.actions).toEqual([]);
  }, 100000);
  it('proposes adding a member without executing the write', async () => {
    const result = await chatAsManager(message('Propose adding Charlie to the trip group. Only add_member, no other change. Wait for my confirmation.'), populatedTrip, config);
    console.info('Member proposal:', JSON.stringify(result));
    expect(result.actions).toEqual([{ type: 'add_member', name: 'Charlie' }]);
    expect(populatedTrip.members).toEqual(['Alice', 'Bob']);
  }, 100000);
  it('answers a short summary command without inference latency', async () => {
    const start = Date.now();
    const result = await chatAsManager(message('summary'), populatedTrip, config);
    console.info('Quick summary:', JSON.stringify(result), 'ms:', Date.now() - start);
    expect(result.localRead).toBe(true);
    expect(result.reply).toContain('230');
    expect(result.actions).toEqual([]);
  }, 100000);
});
