import { agentActionSchema, describeAction, suggestNext } from '@trailbrain/core';
import type { ChatSession, ChatMessage, ManualView } from '@trailbrain/core';
import { db } from './db';

export async function createPlanningChat(): Promise<ChatSession> {
  const session = { id: crypto.randomUUID(), title: 'New trip idea', updatedAt: Date.now() };
  await db.chatSessions.add(session);
  return session;
}

export async function ensureTripChat(tripId: string): Promise<ChatSession> {
  return db.transaction('rw', db.chatSessions, db.trips, async () => {
    const existing = await db.chatSessions.where('tripId').equals(tripId).first();
    if (existing) return existing;
    const trip = await db.trips.get(tripId);
    if (!trip) throw new Error('Trip not found.');
    const session = { id: crypto.randomUUID(), tripId, title: trip.name, updatedAt: Date.now() };
    await db.chatSessions.add(session);
    return session;
  });
}

export function listChatSessions(): Promise<ChatSession[]> {
  return db.chatSessions.orderBy('updatedAt').reverse().toArray();
}

export function listChatMessages(sessionId: string): Promise<ChatMessage[]> {
  return db.chatMessages.where('sessionId').equals(sessionId).sortBy('ts');
}

export async function saveChatMessage(input: Omit<ChatMessage, 'id' | 'ts'>): Promise<ChatMessage> {
  return db.transaction('rw', db.chatMessages, db.chatSessions, async () => {
    const session = await db.chatSessions.get(input.sessionId);
    if (!session) throw new Error('Chat session not found.');
    const history = await listChatMessages(input.sessionId);
    const message = { ...input, id: crypto.randomUUID(), ts: Math.max(Date.now(), (history.at(-1)?.ts ?? 0) + 1) };
    await db.chatMessages.add(message);
    await db.chatSessions.update(session.id, { updatedAt: message.ts,
      ...(!session.tripId && input.role === 'user' && session.title === 'New trip idea' ? { title: input.content.slice(0, 60) } : {}),
    });
    return message;
  });
}

/** One transaction links the mutation and its audit status, preventing duplicate execution. */
export async function confirmChatAction(sessionId: string, messageId: string, index: number,
  location?: { lat: number; lon: number }): Promise<{ tripId: string; view?: ManualView }> {
  return db.transaction('rw', [db.chatSessions, db.chatMessages, db.trips, db.waypoints, db.expenses, db.memberLocations], async () => {
    const session = await db.chatSessions.get(sessionId);
    const message = await db.chatMessages.get(messageId);
    if (!session || message?.sessionId !== sessionId || message.role !== 'assistant') throw new Error('Proposal not found.');
    if (message.actionStatuses?.[index] !== 'pending') throw new Error('This proposal is no longer pending.');
    const action = agentActionSchema.parse(message.actions?.[index]);
    const now = Date.now();
    let tripId = session.tripId;
    let view: ManualView | undefined;
    let detail = '';
    if (['add_waypoint_here', 'check_in_here', 'suggest_next'].includes(action.type)
      && (!location || !Number.isFinite(location.lat) || !Number.isFinite(location.lon)
        || Math.abs(location.lat) > 90 || Math.abs(location.lon) > 180)) throw new Error('A current device location is required.');
    if (action.type === 'create_trip') {
      if (tripId) throw new Error('This conversation already manages a trip.');
      if (action.startDate && action.endDate && action.startDate > action.endDate) throw new Error('End date must follow start date.');
      tripId = crypto.randomUUID();
      await db.trips.add({ name: action.name, destination: action.destination, startDate: action.startDate,
        endDate: action.endDate, currency: action.currency, members: action.members,
        id: tripId, createdAt: now, updatedAt: now });
      await db.chatSessions.update(sessionId, { tripId, title: action.name });
    } else {
      if (!tripId) throw new Error('Create the trip before managing it.');
      const trip = await db.trips.get(tripId);
      if (!trip) throw new Error('Trip not found.');
      switch (action.type) {
        case 'update_trip': {
          const updated = { ...trip, ...action.changes };
          if (updated.startDate && updated.endDate && updated.startDate > updated.endDate) throw new Error('End date must follow start date.');
          if (action.changes.currency && action.changes.currency !== trip.currency
            && await db.expenses.where('tripId').equals(tripId).count()) throw new Error('Cannot change currency after recording expenses.');
          await db.trips.update(tripId, action.changes);
          if (action.changes.name) await db.chatSessions.update(sessionId, { title: action.changes.name });
          break;
        }
        case 'add_member':
          if (trip.members.includes(action.name)) throw new Error('This member is already in the trip.');
          await db.trips.update(tripId, { members: [...trip.members, action.name] });
          break;
        case 'add_expense': {
          if (![action.paidBy, ...action.splitAmong].every((member) => trip.members.includes(member))) throw new Error('Expense members must belong to this trip.');
          await db.expenses.add({ description: action.description, amount: action.amount, category: action.category,
            paidBy: action.paidBy, splitAmong: action.splitAmong, id: crypto.randomUUID(), tripId, ts: now });
          break;
        }
        case 'add_waypoint_here': {
          if (!location || !Number.isFinite(location.lat) || !Number.isFinite(location.lon)
            || Math.abs(location.lat) > 90 || Math.abs(location.lon) > 180) throw new Error('A current device location is required.');
          await db.waypoints.add({ name: action.name, note: action.note, elevation: action.elevation,
            ...location, id: crypto.randomUUID(), tripId, visited: false });
          break;
        }
        case 'set_waypoint_visited': {
          const point = await db.waypoints.get(action.waypointId);
          if (point?.tripId !== tripId) throw new Error('Waypoint does not belong to this trip.');
          await db.waypoints.update(action.waypointId, { visited: action.visited });
          break;
        }
        case 'open_view': view = action.view; break;
        case 'check_in_here': {
          if (!trip.members.includes(action.member)) throw new Error('Check-in member must belong to this trip.');
          const existing = await db.memberLocations.where('[tripId+name]').equals([tripId, action.member]).first();
          await db.memberLocations.put({ id: existing?.id ?? crypto.randomUUID(), tripId, name: action.member,
            lat: location!.lat, lon: location!.lon, note: action.note, ts: now });
          break;
        }
        case 'suggest_next': {
          const waypoints = await db.waypoints.where('tripId').equals(tripId).toArray();
          const suggestions = suggestNext({ ...trip, waypoints, expenses: [], photos: [], memberLocations: [] },
            location!.lat, location!.lon, action);
          detail = suggestions.length ? '\n' + suggestions.map((suggestion, index) =>
            `${index + 1}. ${suggestion.waypoint.name}: ${suggestion.reason}`).join('\n')
            : '\nNo unvisited stops. Add waypoints on the map first.';
          break;
        }
      }
    }
    await db.trips.update(tripId, { updatedAt: now });
    const statuses = [...message.actionStatuses!];
    statuses[index] = 'applied';
    await db.chatMessages.update(messageId, { actionStatuses: statuses });
    const history = await listChatMessages(sessionId);
    await db.chatMessages.add({ id: crypto.randomUUID(), sessionId, role: 'assistant', source: 'local',
      content: `Confirmed: ${describeAction(action)}.${detail}`, ts: Math.max(now, (history.at(-1)?.ts ?? 0) + 1) });
    await db.chatSessions.update(sessionId, { updatedAt: now });
    return { tripId, view };
  });
}

export async function dismissChatAction(sessionId: string, messageId: string, index: number): Promise<void> {
  await db.transaction('rw', db.chatMessages, async () => {
    const message = await db.chatMessages.get(messageId);
    if (message?.sessionId !== sessionId || message.actionStatuses?.[index] !== 'pending') throw new Error('Proposal is not pending.');
    const statuses = [...message.actionStatuses];
    statuses[index] = 'dismissed';
    await db.chatMessages.update(messageId, { actionStatuses: statuses });
  });
}
