import { describe, it, expect } from 'vitest';
import { suggestNext } from './suggest';
import type { Trip, Waypoint } from './types';

function waypoint(overrides: Partial<Waypoint>): Waypoint {
  return {
    id: 'w1',
    name: 'Base Camp',
    lat: 0,
    lon: 0,
    visited: false,
    ...overrides,
  };
}

function trip(waypoints: Waypoint[]): Trip {
  return {
    id: 't1',
    name: 'Test Trek',
    destination: 'Hills',
    startDate: '2026-10-01',
    endDate: '2026-10-03',
    currency: 'INR',
    members: ['alice', 'bob'],
    waypoints,
    expenses: [],
    photos: [],
    memberLocations: [],
    createdAt: 0,
    updatedAt: 0,
  };
}

describe('suggestNext', () => {
  it('returns an empty list when everything is visited', () => {
    const wps = [waypoint({ visited: true })];
    expect(suggestNext(trip(wps), 0, 0)).toEqual([]);
  });

  it('prefers the nearer waypoint when all else is equal', () => {
    const wps = [
      waypoint({ id: 'near', name: 'Near Viewpoint', lat: 0.01, lon: 0 }),
      waypoint({ id: 'far', name: 'Far Viewpoint', lat: 0.9, lon: 0 }),
    ];
    const result = suggestNext(trip(wps), 0, 0);
    expect(result[0]?.waypoint.id).toBe('near');
  });

  it('deprioritizes a peak in bad weather', () => {
    const wps = [
      waypoint({ id: 'peak', name: 'Snow Peak', lat: 0.02, lon: 0, elevation: 1500 }),
      waypoint({ id: 'forest', name: 'Old Forest', lat: 0.05, lon: 0 }),
    ];
    const clear = suggestNext(trip(wps), 0, 0, { weather: 'clear' });
    const fog = suggestNext(trip(wps), 0, 0, { weather: 'fog' });

    expect(clear[0]?.waypoint.id).toBe('peak');
    expect(fog[0]?.waypoint.id).toBe('forest');
  });

  it('returns at most three suggestions', () => {
    const wps = Array.from({ length: 5 }, (_, i) =>
      waypoint({ id: `w${i}`, name: 'Viewpoint', lat: 0.01 * (i + 1), lon: 0 }),
    );
    expect(suggestNext(trip(wps), 0, 0).length).toBe(3);
  });
});
