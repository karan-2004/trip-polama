import { describe, expect, it } from 'vitest';
import { readTripData, quickTripRead, isRetrievalRequest } from './tripRead';
import { isReadOnlyAction } from './chat';
import type { Trip } from './types';

const trip: Trip = { id: 't', name: 'Trek', destination: 'Manali', startDate: '', endDate: '', currency: 'INR', members: ['Alice', 'Bob'],
  waypoints: [{ id: 'a', name: 'Camp', lat: 32, lon: 77, visited: true }, { id: 'b', name: 'Ridge', lat: 32.01, lon: 77, visited: false }],
  expenses: Array.from({ length: 12 }, (_, index) => ({ id: `e${index}`, description: index === 0 ? 'Old taxi' : `Meal ${index}`, amount: 100,
    category: 'food', paidBy: 'Alice', splitAmong: ['Alice', 'Bob'], ts: index + 1 })), photos: [], memberLocations: [], createdAt: 1, updatedAt: 1 };

describe('local read operations', () => {
  it('summarizes saved records with exact aggregate totals', () => {
    const reply = readTripData(trip, { type: 'read_trip', section: 'summary' });
    expect(reply).toContain('INR 1200.00');
    expect(reply).toContain('1 visited, 1 remaining');
    expect(reply).toContain('Alice, Bob');
  });
  it('retrieves older expenses beyond the model recent snapshot and computes balances', () => {
    const reply = readTripData(trip, { type: 'read_trip', section: 'expenses', query: 'taxi' });
    expect(reply).toContain('Old taxi');
    expect(reply).toContain('Bob owes Alice INR 600.00');
  });
  it('lists only remaining stops when requested, without coordinates', () => {
    const reply = readTripData(trip, { type: 'read_trip', section: 'waypoints', query: 'remaining' });
    expect(reply).toContain('Ridge');
    expect(reply).not.toContain('Camp');
    expect(reply).not.toContain('32.01');
  });
  it('recognizes only known read commands, never a write or mixed instruction', () => {
    expect(quickTripRead('Trip summary')).toEqual({ type: 'read_trip', section: 'summary' });
    expect(quickTripRead('Add an expense and show summary')).toBeNull();
    expect(isReadOnlyAction({ type: 'read_trip', section: 'expenses' })).toBe(true);
    expect(isReadOnlyAction({ type: 'open_view', view: 'photos' })).toBe(true);
    expect(isReadOnlyAction({ type: 'add_member', name: 'A' })).toBe(false);
    expect(isRetrievalRequest('Please retrieve the expense summary. Do not change anything.')).toBe(true);
    expect(isRetrievalRequest('Show expenses and add a new meal expense')).toBe(false);
  });
});
