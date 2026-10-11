import { researchSpotSchema } from '@trip-polama/core';
import type { ResearchSpot } from '@trip-polama/core';

interface WikiPage {
  pageid: number; title: string; index?: number; extract?: string; fullurl?: string;
  coordinates?: { lat: number; lon: number }[];
}
/** Resolve the destination first, then retrieve named places within 10 km. */
export async function findDestinationSpots(destination: string, signal: AbortSignal): Promise<ResearchSpot[]> {
  async function query(params: Record<string, string>) {
    const url = new URL('https://en.wikipedia.org/w/api.php');
    url.search = new URLSearchParams({ action: 'query', format: 'json', prop: 'coordinates|extracts|info',
      exintro: '1', explaintext: '1', exchars: '300', inprop: 'url', ...params }).toString();
    const response = await fetch(url.toString(), { signal, headers: { 'User-Agent': 'trip-polama/0.1 (destination spots)' } });
    if (!response.ok) throw new Error('Place data unavailable');
    const data = await response.json() as { query?: { pages?: Record<string, WikiPage> } };
    return Object.values(data.query?.pages ?? {});
  }
  const pages = await query({ generator: 'search', gsrsearch: destination, gsrlimit: '5' });
  const center = pages.sort((a, b) => (a.index ?? 0) - (b.index ?? 0)).find((page) => page.coordinates?.length);
  if (!center) return [];
  const coordinate = center.coordinates![0]!;
  if (!Number.isFinite(coordinate.lat) || !Number.isFinite(coordinate.lon)) return [];
  const nearby = await query({ generator: 'geosearch', ggscoord: `${coordinate.lat}|${coordinate.lon}`,
    ggsradius: '10000', ggslimit: '10' });
  const result: ResearchSpot[] = [];
  for (const page of nearby) {
    if (page.pageid === center.pageid || !page.coordinates?.length) continue;
    if (/constituency|electoral district|administrative division/i.test(page.title)) continue;
    const spot = researchSpotSchema.safeParse({ id: `wiki:${page.pageid}`, name: page.title.slice(0, 120),
      lat: page.coordinates[0]!.lat, lon: page.coordinates[0]!.lon,
      sourceUrl: page.fullurl || `https://en.wikipedia.org/?curid=${page.pageid}`,
      description: page.extract?.slice(0, 1000), retrievedAt: new Date().toISOString() });
    if (spot.success) result.push(spot.data);
  }
  return result.slice(0, 8);
}
