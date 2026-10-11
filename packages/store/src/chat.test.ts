import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AgentAction } from '@trailbrain/core';
import { db, TrailBrainDB } from './db';
import { createTrip, getTripFull } from './repo';
import { createPlanningChat, ensureTripChat, saveChatMessage, listChatMessages, confirmChatAction, dismissChatAction } from './chat';

beforeEach(async () => { await db.open(); });
afterEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
  db.close();
});
async function proposal(sessionId: string, action: AgentAction) {
  return saveChatMessage({ sessionId, role: 'assistant', source: 'model', content: 'Proposed change.',
    actions: [action], actionStatuses: ['pending'] });
}
const creation: AgentAction = { type: 'create_trip', name: 'Trek', destination: 'Hills',
  startDate: '', endDate: '', currency: 'INR', members: ['A', 'B'] };

describe('persistent trip conversations', () => {
  it('creates a trip only after confirmation, keeps the chat and prevents double execution', async () => {
    const session = await createPlanningChat();
    await saveChatMessage({ sessionId: session.id, role: 'user', content: 'Plan a trek' });
    const message = await proposal(session.id, creation);
    expect(await db.trips.count()).toBe(0);
    const result = await confirmChatAction(session.id, message.id, 0);
    expect((await db.chatSessions.get(session.id))?.tripId).toBe(result.tripId);
    expect((await ensureTripChat(result.tripId)).id).toBe(session.id);
    await expect(confirmChatAction(session.id, message.id, 0)).rejects.toThrow('no longer pending');
    expect(await db.trips.count()).toBe(1);
    db.close(); await db.open();
    expect(await listChatMessages(session.id)).toHaveLength(3);
  });
  it('applies chat expenses to the same data used by manual tools', async () => {
    const trip = await createTrip({ name: 'Trek', destination: 'Hills', startDate: '', endDate: '', currency: 'INR', members: ['A', 'B'] });
    const session = await ensureTripChat(trip.id);
    const message = await proposal(session.id, { type: 'add_expense', description: 'Lunch', amount: 200,
      category: 'food', paidBy: 'A', splitAmong: ['A', 'B'] });
    await confirmChatAction(session.id, message.id, 0);
    expect((await getTripFull(trip.id))?.expenses[0]?.amount).toBe(200);
  });
  it('rolls back invalid membership and rejects cross-trip waypoint changes', async () => {
    const trip = await createTrip({ name: 'Trek', destination: '', startDate: '', endDate: '', currency: 'INR', members: ['A'] });
    const session = await ensureTripChat(trip.id);
    const badExpense = await proposal(session.id, { type: 'add_expense', description: 'Food', amount: 10,
      category: 'food', paidBy: 'Outsider', splitAmong: ['A'] });
    await expect(confirmChatAction(session.id, badExpense.id, 0)).rejects.toThrow('must belong');
    expect(await db.expenses.count()).toBe(0);
    expect((await db.chatMessages.get(badExpense.id))?.actionStatuses).toEqual(['pending']);
    await db.waypoints.add({ id: 'foreign', tripId: 'other', name: 'Other', lat: 0, lon: 0, visited: false });
    const badPoint = await proposal(session.id, { type: 'set_waypoint_visited', waypointId: 'foreign', visited: true });
    await expect(confirmChatAction(session.id, badPoint.id, 0)).rejects.toThrow('does not belong');
    expect((await db.waypoints.get('foreign'))?.visited).toBe(false);
  });
  it('does not execute dismissed proposals or proposals from another session', async () => {
    const session = await createPlanningChat();
    const other = await createPlanningChat();
    const message = await proposal(session.id, creation);
    await expect(confirmChatAction(other.id, message.id, 0)).rejects.toThrow('not found');
    await dismissChatAction(session.id, message.id, 0);
    await expect(confirmChatAction(session.id, message.id, 0)).rejects.toThrow('no longer pending');
    expect(await db.trips.count()).toBe(0);
  });
  it('keeps user and assistant messages in chronological order', async () => {
    const session = await createPlanningChat();
    const first = await saveChatMessage({ sessionId: session.id, role: 'user', content: 'Hello' });
    const second = await saveChatMessage({ sessionId: session.id, role: 'assistant', content: 'Hi' });
    expect(second.ts).toBeGreaterThan(first.ts);
    expect((await listChatMessages(session.id)).map((message) => message.content)).toEqual(['Hello', 'Hi']);
  });
  it('uses device-confirmed GPS for check-ins and calculated suggestions', async () => {
    const trip = await createTrip({ name: 'Trek', destination: '', startDate: '', endDate: '', currency: 'INR', members: ['A'] });
    const session = await ensureTripChat(trip.id);
    const checkIn = await proposal(session.id, { type: 'check_in_here', member: 'A' });
    await expect(confirmChatAction(session.id, checkIn.id, 0)).rejects.toThrow('current device location');
    await confirmChatAction(session.id, checkIn.id, 0, { lat: 32, lon: 77 });
    expect((await getTripFull(trip.id))?.memberLocations[0]?.lat).toBe(32);
    await db.waypoints.add({ id: 'ridge', tripId: trip.id, name: 'Ridge', lat: 32.01, lon: 77, visited: false });
    const next = await proposal(session.id, { type: 'suggest_next', weather: 'clear', daylightHours: 4, pace: 'moderate' });
    await confirmChatAction(session.id, next.id, 0, { lat: 32, lon: 77 });
    expect((await listChatMessages(session.id)).at(-1)?.content).toContain('Ridge');
  });
  it('upgrades an existing version-1 database without losing trip or check-in records', async () => {
    const databaseName = `migration-${crypto.randomUUID()}`;
    const legacy = new Dexie(databaseName);
    legacy.version(1).stores({ trips: 'id, updatedAt', waypoints: 'id, tripId, visited',
      expenses: 'id, tripId, ts', photos: 'id, tripId, ts', memberLocations: 'id, tripId, name, ts' });
    const upgraded = new TrailBrainDB(databaseName);
    try {
      await legacy.open();
      await legacy.table('trips').add({ id: 'old', name: 'Saved trek', updatedAt: 1 });
      await legacy.table('memberLocations').add({ id: 'pin', tripId: 'old', name: 'A', lat: 32, lon: 77, ts: 1 });
      legacy.close();
      await upgraded.open();
      expect((await upgraded.trips.get('old'))?.name).toBe('Saved trek');
      expect(await upgraded.chatSessions.count()).toBe(0);
      expect(await upgraded.memberLocations.where('[tripId+name]').equals(['old', 'A']).count()).toBe(1);
    } finally {
      legacy.close();
      await upgraded.delete();
    }
  });
  it('allows only one execution when confirmation is submitted concurrently', async () => {
    const session = await createPlanningChat();
    const message = await proposal(session.id, creation);
    const results = await Promise.allSettled([
      confirmChatAction(session.id, message.id, 0), confirmChatAction(session.id, message.id, 0),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(await db.trips.count()).toBe(1);
  });
});
