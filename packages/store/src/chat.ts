import { agentActionSchema, describeAction, suggestNext, isReadOnlyAction, readTripData, researchSpotSchema } from '@trip-polama/core';
import type { ChatSession, ChatMessage, ManualView, AgentRole } from '@trip-polama/core';
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

export async function setSessionAgent(sessionId: string, role: AgentRole): Promise<void> {
  await db.transaction('rw', db.chatSessions, async () => {
    const session = await db.chatSessions.get(sessionId);
    if (!session) throw new Error('Conversation not found.');
    if (!session.tripId && role === 'manager') throw new Error('Create a trip before using the manager.');
    await db.chatSessions.update(sessionId, { activeAgent: role });
  });
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
    if (input.spots?.length) {
      const spots = input.spots.map((spot) => researchSpotSchema.parse(spot));
      const merged = new Map([...(session.suggestedSpots ?? []), ...spots].map((spot) => [spot.id, spot]));
      await db.chatSessions.update(session.id, { suggestedSpots: [...merged.values()].slice(-20) });
    }
    await db.chatSessions.update(session.id, { updatedAt: message.ts,
      ...(!session.tripId && input.role === 'user' && session.title === 'New trip idea' ? { title: input.content.slice(0, 60) } : {}),
    });
    return message;
  });
}

/** One transaction links the mutation and its audit status, preventing duplicate execution. */
export async function confirmChatAction(sessionId: string, messageId: string, index: number,
  location?: { lat: number; lon: number }, options: { readOnly?: boolean; selectedSpotIds?: string[] } = {}): Promise<{ tripId: string; view?: ManualView }> {
  return db.transaction('rw', [db.chatSessions, db.chatMessages, db.trips, db.waypoints, db.expenses, db.memberLocations, db.photos], async () => {
    const session = await db.chatSessions.get(sessionId);
    const message = await db.chatMessages.get(messageId);
    if (!session || message?.sessionId !== sessionId || message.role !== 'assistant') throw new Error('Proposal not found.');
    if (message.actionStatuses?.[index] !== 'pending') throw new Error('This proposal is no longer pending.');
    const action = agentActionSchema.parse(message.actions?.[index]);
    if (options.readOnly && !isReadOnlyAction(action)) throw new Error('This change needs your confirmation.');
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
      const ids = options.selectedSpotIds ?? action.spotIds ?? [];
      if (ids.length > 20 || new Set(ids).size !== ids.length) throw new Error('Invalid stop selection.');
      for (const id of ids) {
        const spot = session.suggestedSpots?.find((candidate) => candidate.id === id);
        if (!spot) throw new Error('This stop is not part of the suggested trip locations.');
        const checked = researchSpotSchema.parse(spot);
        await db.waypoints.add({ id: crypto.randomUUID(), tripId, name: checked.name,
          placeName: checked.name, lat: checked.lat, lon: checked.lon, note: checked.description,
          sourceUrl: checked.sourceUrl, visited: false });
      }
      await db.chatSessions.update(sessionId, { tripId, title: action.name, activeAgent: 'manager' });
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
        case 'read_trip': {
          const [waypoints, expenses, memberLocations, photos] = await Promise.all([
            db.waypoints.where('tripId').equals(tripId).toArray(), db.expenses.where('tripId').equals(tripId).toArray(),
            db.memberLocations.where('tripId').equals(tripId).toArray(),
            db.photos.where('tripId').equals(tripId).toArray(),
          ]);
          detail = '\n' + readTripData({ ...trip, waypoints, expenses, photos, memberLocations }, action);
          break;
        }
      }
    }
    if (!isReadOnlyAction(action)) await db.trips.update(tripId, { updatedAt: now });
    const statuses = [...message.actionStatuses!];
    statuses[index] = 'applied';
    await db.chatMessages.update(messageId, { actionStatuses: statuses });
    const history = await listChatMessages(sessionId);
    await db.chatMessages.add({ id: crypto.randomUUID(), sessionId, role: 'assistant', source: 'local',
      content: `${isReadOnlyAction(action) ? 'Result' : 'Confirmed'}: ${describeAction(action)}.${detail}`, ts: Math.max(now, (history.at(-1)?.ts ?? 0) + 1) });
    await db.chatSessions.update(sessionId, { updatedAt: now });
    return { tripId, view };
  });
}

/** A direct user attachment gesture saves a batch atomically, never invokes a model. */
export async function saveChatPhotos(sessionId: string, files: File[], note = ''): Promise<ChatMessage> {
  if (!files.length || files.length > 10 || files.reduce((sum, file) => sum + file.size, 0) > 50 * 1024 * 1024) throw new Error('Choose up to 10 images, totaling at most 50 MB.');
  if (files.some((file) => !file.type.startsWith('image/') || !file.size || file.size > 10 * 1024 * 1024)) throw new Error('Each attachment must be an image up to 10 MB.');
  return db.transaction('rw', [db.chatSessions, db.chatMessages, db.trips, db.photos], async () => {
    const session = await db.chatSessions.get(sessionId);
    if (!session?.tripId || !await db.trips.get(session.tripId)) throw new Error('Create a trip before adding photos.');
    const photoIds: string[] = [];
    const timestamp = Date.now();
    for (const file of files) {
      const id = crypto.randomUUID();
      photoIds.push(id);
      await db.photos.add({ id, tripId: session.tripId, image: file, filename: file.name, note: note || undefined, ts: timestamp });
    }
    const history = await listChatMessages(sessionId);
    const message: ChatMessage = { id: crypto.randomUUID(), sessionId, role: 'user', source: 'local', photoIds,
      content: `Added ${files.length} photo${files.length === 1 ? '' : 's'} to the trip album${note ? `: ${note}` : '.'}`,
      ts: Math.max(timestamp, (history.at(-1)?.ts ?? 0) + 1) };
    await db.chatMessages.add(message);
    await db.trips.update(session.tripId, { updatedAt: timestamp });
    await db.chatSessions.update(sessionId, { updatedAt: timestamp });
    return message;
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
