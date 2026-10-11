import { describe, it, expect } from 'vitest';
import { fallbackPlan } from './planner';
import type { Trip } from '@trip-polama/core';

const trip: Trip = {
  id: 't1',
  name: 'Trek',
  destination: 'Hills',
  startDate: '2026-10-01',
  endDate: '2026-10-03',
  currency: 'INR',
  members: ['alice'],
  waypoints: [
    { id: 'w1', name: 'Base Camp', lat: 0, lon: 0, visited: false },
  ],
  expenses: [],
  photos: [],
  memberLocations: [],
  createdAt: 0,
  updatedAt: 0,
};

describe('fallbackPlan', () => {
  it('produces one itinerary entry per day', () => {
    const plan = fallbackPlan(trip);
    expect(plan.source).toBe('offline-fallback');
    expect(plan.itinerary).toHaveLength(3);
  });

  it('names the first waypoint on day one', () => {
    const plan = fallbackPlan(trip);
    expect(plan.itinerary[0]).toContain('Base Camp');
  });

  it('always includes packing and budget tips', () => {
    const plan = fallbackPlan(trip);
    expect(plan.packing.length).toBeGreaterThan(0);
    expect(plan.budgetTips.length).toBeGreaterThan(0);
  });
});
