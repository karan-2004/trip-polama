import { db } from './db';
import type {
  TripRow,
  WaypointRow,
  ExpenseRow,
  PhotoRow,
  MemberLocationRow,
} from './entities';

const uid = (): string => crypto.randomUUID();
const now = (): number => Date.now();

export async function createTrip(input: Omit<TripRow, 'id' | 'createdAt' | 'updatedAt'>): Promise<TripRow> {
  const row: TripRow = {
    ...input,
    id: uid(),
    createdAt: now(),
    updatedAt: now(),
  };
  await db.trips.add(row);
  return row;
}

export function listTrips(): Promise<TripRow[]> {
  return db.trips.orderBy('updatedAt').reverse().toArray();
}

export async function addWaypoint(input: Omit<WaypointRow, 'id' | 'tripId'> & { tripId: string }): Promise<WaypointRow> {
  const row: WaypointRow = { ...input, id: uid() };
  await db.waypoints.add(row);
  await touchTrip(input.tripId);
  return row;
}

export function listWaypoints(tripId: string): Promise<WaypointRow[]> {
  return db.waypoints.where('tripId').equals(tripId).toArray();
}

export async function addExpense(input: Omit<ExpenseRow, 'id' | 'tripId'> & { tripId: string }): Promise<ExpenseRow> {
  const row: ExpenseRow = { ...input, id: uid() };
  await db.expenses.add(row);
  await touchTrip(input.tripId);
  return row;
}

export function listExpenses(tripId: string): Promise<ExpenseRow[]> {
  return db.expenses.where('tripId').equals(tripId).toArray();
}

export async function addPhoto(input: Omit<PhotoRow, 'id' | 'tripId'> & { tripId: string }): Promise<PhotoRow> {
  const row: PhotoRow = { ...input, id: uid() };
  await db.photos.add(row);
  await touchTrip(input.tripId);
  return row;
}

export function listPhotos(tripId: string): Promise<PhotoRow[]> {
  return db.photos.where('tripId').equals(tripId).toArray();
}

export async function upsertMemberLocation(
  input: Omit<MemberLocationRow, 'id' | 'tripId'> & { tripId: string },
): Promise<MemberLocationRow> {
  const existing = await db.memberLocations.where('[tripId+name]').equals([input.tripId, input.name]).first();
  const row: MemberLocationRow = { ...input, id: existing?.id ?? uid() };
  await db.memberLocations.put(row);
  await touchTrip(input.tripId);
  return row;
}

export function listMemberLocations(tripId: string): Promise<MemberLocationRow[]> {
  return db.memberLocations.where('tripId').equals(tripId).toArray();
}

async function touchTrip(tripId: string): Promise<void> {
  await db.trips.update(tripId, { updatedAt: now() });
}
