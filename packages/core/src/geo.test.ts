import { describe, it, expect } from 'vitest';
import { haversineKm } from './geo';

describe('haversineKm', () => {
  it('returns ~111 km for one degree of latitude', () => {
    expect(haversineKm(0, 0, 1, 0)).toBeCloseTo(111.19, 1);
  });

  it('returns 0 for identical points', () => {
    expect(haversineKm(40.7128, -74.006, 40.7128, -74.006)).toBe(0);
  });

  it('is symmetric', () => {
    const a = haversineKm(10, 20, 30, 40);
    const b = haversineKm(30, 40, 10, 20);
    expect(a).toBeCloseTo(b, 6);
  });
});
