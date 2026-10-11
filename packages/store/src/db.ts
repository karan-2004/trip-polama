import Dexie, { type Table } from 'dexie';
import type {
  TripRow,
  WaypointRow,
  ExpenseRow,
  PhotoRow,
  MemberLocationRow,
} from './entities';

export class TrailBrainDB extends Dexie {
  trips!: Table<TripRow, string>;
  waypoints!: Table<WaypointRow, string>;
  expenses!: Table<ExpenseRow, string>;
  photos!: Table<PhotoRow, string>;
  memberLocations!: Table<MemberLocationRow, string>;

  constructor(name = 'trailbrain') {
    super(name);
    this.version(1).stores({
      trips: 'id, updatedAt',
      waypoints: 'id, tripId, visited',
      expenses: 'id, tripId, ts',
      photos: 'id, tripId, ts',
      memberLocations: 'id, tripId, name, ts',
    });
  }
}

export const db = new TrailBrainDB();
