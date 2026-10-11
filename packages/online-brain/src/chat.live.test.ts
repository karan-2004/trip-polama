import { describe, expect, it } from 'vitest';
import type { ChatMessage, Trip } from '@trailbrain/core';
import { chatWithTrip } from './chat';

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

// Opt-in, synthetic context only. Tests validate proposals, never execute mutations.
describe.skipIf(!enabled)('live Ollama trip chat', () => {
  it('explores an idea without prematurely creating a trip', async () => {
    const result = await chatWithTrip(message('I want an outdoor weekend but have not chosen a destination, dates or budget. Help me explore. Do not create a trip yet.'), null, config);
    console.info('Planner exploration:', JSON.stringify(result));
    expect(result.reply.length).toBeGreaterThan(0);
    expect(result.actions).toEqual([]);
  }, 100000);

  it('proposes complete trip creation with supplied details', async () => {
    const result = await chatWithTrip(message('Propose creating a trip named Manali weekend, destination Manali, from 2026-10-20 to 2026-10-22, currency INR, members Alice and Bob. Return exactly one create_trip proposal. Do not claim it is already saved.'), null, config);
    console.info('Planner creation:', JSON.stringify(result));
    expect(result.actions).toEqual([{ type: 'create_trip', name: 'Manali weekend', destination: 'Manali',
      startDate: '2026-10-20', endDate: '2026-10-22', currency: 'INR', members: ['Alice', 'Bob'] }]);
  }, 100000);

  it('proposes an expense in manager mode without changing the trip', async () => {
    const result = await chatWithTrip(message('Propose adding lunch costing 600 INR, category food, paid by Alice, split equally among Alice and Bob. Return exactly one add_expense proposal; do not claim it has already been recorded.'), trip, config);
    console.info('Manager expense:', JSON.stringify(result));
    expect(result.actions).toEqual([{ type: 'add_expense', description: expect.any(String), amount: 600,
      category: 'food', paidBy: 'Alice', splitAmong: ['Alice', 'Bob'] }]);
    expect(trip.expenses).toEqual([]);
  }, 100000);
});
