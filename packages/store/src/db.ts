import Dexie, { type Table } from 'dexie';
import type { ChatSession, ChatMessage } from '@trip-polama/core';
import type {
  TripRow,
  WaypointRow,
  ExpenseRow,
  PhotoRow,
  MemberLocationRow,
} from './entities';

export class TripPolamaDB extends Dexie {
  trips!: Table<TripRow, string>;
  waypoints!: Table<WaypointRow, string>;
  expenses!: Table<ExpenseRow, string>;
  photos!: Table<PhotoRow, string>;
  memberLocations!: Table<MemberLocationRow, string>;
  chatSessions!: Table<ChatSession, string>;
  chatMessages!: Table<ChatMessage, string>;

  // Keep the persisted database ID so the rebrand retains existing user data.
  constructor(name = 'trailbrain') {
    super(name);
    this.version(1).stores({
      trips: 'id, updatedAt',
      waypoints: 'id, tripId, visited',
      expenses: 'id, tripId, ts',
      photos: 'id, tripId, ts',
      memberLocations: 'id, tripId, name, ts',
    });
    this.version(2).stores({
      chatSessions: 'id, &tripId, updatedAt',
      chatMessages: 'id, sessionId, ts',
    });
    this.version(3).stores({ memberLocations: 'id, tripId, name, ts, [tripId+name]' });
  }
}

export const db = new TripPolamaDB();
