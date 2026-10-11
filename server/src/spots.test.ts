import { afterEach, expect, it, vi } from 'vitest';
import { findDestinationSpots } from './spots';
afterEach(() => vi.unstubAllGlobals());
it('uses destination and nearby-place coordinates from source data, excluding invalid points', async () => {
  const fetcher = vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ query: { pages: { '1': { pageid: 1, title: 'Manali', index: 1, coordinates: [{ lat: 32, lon: 77 }] } } } }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ query: { pages: {
      '1': { pageid: 1, title: 'Manali', coordinates: [{ lat: 32, lon: 77 }] },
      '2': { pageid: 2, title: 'Temple', coordinates: [{ lat: 32.01, lon: 77.01 }], fullurl: 'https://en.wikipedia.org/wiki/Temple', extract: 'Local temple' },
      '3': { pageid: 3, title: 'Invalid', coordinates: [{ lat: 150, lon: 77 }] },
    } } }) });
  vi.stubGlobal('fetch', fetcher);
  const spots = await findDestinationSpots('Manali, Himachal Pradesh', new AbortController().signal);
  expect(spots).toHaveLength(1);
  expect(spots[0]).toMatchObject({ id: 'wiki:2', name: 'Temple', lat: 32.01, lon: 77.01, sourceUrl: 'https://en.wikipedia.org/wiki/Temple' });
  expect(fetcher.mock.calls[1]?.[0]).toContain('ggscoord=32%7C77');
});
it('returns no spots when the destination cannot be located, instead of inventing geometry', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ query: { pages: {} } }) }));
  expect(await findDestinationSpots('Unknown', new AbortController().signal)).toEqual([]);
});
