import { describe, expect, it } from 'vitest';
import { formatPlaceName } from './placeName';

describe('formatPlaceName', () => {
  it('prefers a locality and adds region and country', () => {
    expect(formatPlaceName({ locality: 'Manali', city: 'Kullu', principalSubdivision: 'Himachal Pradesh', countryName: 'India' }))
      .toBe('Manali, Himachal Pradesh, India');
  });
  it('falls back to city and avoids repeated names', () => {
    expect(formatPlaceName({ city: 'Singapore', countryName: 'Singapore' })).toBe('Singapore');
  });
  it('does not fabricate a place from an empty or malformed response', () => {
    expect(formatPlaceName({ locality: 42 })).toBeNull();
    expect(formatPlaceName({})).toBeNull();
  });
});
