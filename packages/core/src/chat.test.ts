import { describe, expect, it } from 'vitest';
import { agentActionSchema, chatReplySchema, managerReplySchema, sessionAgent } from './chat';

describe('agent action validation', () => {
  it('defaults legacy saved sessions to manager and exploratory sessions to planner', () => {
    expect(sessionAgent({ id: 's', title: 'Idea', updatedAt: 1 })).toBe('planner');
    expect(sessionAgent({ id: 's', title: 'Trip', tripId: 't', updatedAt: 1 })).toBe('manager');
    expect(sessionAgent({ id: 's', title: 'Trip', tripId: 't', activeAgent: 'planner', updatedAt: 1 })).toBe('planner');
  });
  it('does not allow the local manager to create new trips', () => {
    expect(managerReplySchema.safeParse({ reply: 'Create', actions: [{ type: 'create_trip', name: 'Trip', destination: 'Hills',
      startDate: '', endDate: '', currency: 'INR', members: [] }] }).success).toBe(false);
  });
  it('accepts complete trip creation and typed expense proposals', () => {
    expect(agentActionSchema.safeParse({ type: 'create_trip', name: 'Trek', destination: 'Manali',
      startDate: '2026-10-12', endDate: '2026-10-15', currency: 'INR', members: ['A', 'B'] }).success).toBe(true);
    expect(agentActionSchema.safeParse({ type: 'add_expense', description: 'Lunch', amount: 200,
      category: 'food', paidBy: 'A', splitAmong: ['A', 'B'] }).success).toBe(true);
  });
  it('rejects unknown tools, injected trip IDs and invented waypoint coordinates', () => {
    expect(agentActionSchema.safeParse({ type: 'delete_all_trips' }).success).toBe(false);
    expect(agentActionSchema.safeParse({ type: 'add_member', name: 'A', tripId: 'another-trip' }).success).toBe(false);
    expect(agentActionSchema.safeParse({ type: 'add_waypoint_here', name: 'Peak', lat: 12, lon: 34 }).success).toBe(false);
  });
  it('rejects bad dates, duplicate members and nonpositive expenses', () => {
    expect(agentActionSchema.safeParse({ type: 'create_trip', name: 'Trek', destination: 'Hills',
      startDate: '2026-02-31', endDate: '', currency: 'INR', members: ['A', 'A'] }).success).toBe(false);
    expect(agentActionSchema.safeParse({ type: 'add_expense', description: 'Food', amount: -1,
      category: 'food', paidBy: 'A', splitAmong: ['A'] }).success).toBe(false);
  });
  it('rejects malformed assistant replies instead of treating them as instructions', () => {
    expect(chatReplySchema.safeParse({ reply: 'Done', actions: [{ type: 'run_code', code: 'anything' }] }).success).toBe(false);
    expect(chatReplySchema.safeParse({ reply: 'Where would you like to go?', actions: [] }).success).toBe(true);
  });
});
