import type { Expense, MemberLocation, Photo, Waypoint } from '@trip-polama/core';

export interface TripRow {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  currency: string;
  members: string[];
  createdAt: number;
  updatedAt: number;
}

export interface WaypointRow extends Waypoint {
  tripId: string;
}

export interface ExpenseRow extends Expense {
  tripId: string;
}

export interface PhotoRow extends Photo {
  tripId: string;
}

export interface MemberLocationRow extends MemberLocation {
  id: string;
  tripId: string;
}
