/** Prefer locality over city, with region/country context and no duplicate labels. */
export function formatPlaceName(data: Record<string, unknown>): string | null {
  const parts = [data.locality || data.city, data.principalSubdivision, data.countryName]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .map((part) => part.trim());
  return [...new Set(parts)].join(', ') || null;
}

/** Only call for the device's current fix, never historical or remote positions. */
export async function lookupCurrentPlace(lat: number, lon: number): Promise<string | null> {
  const url = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client');
  url.search = new URLSearchParams({
    latitude: String(lat), longitude: String(lon), localityLanguage: 'en',
  }).toString();
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('Place lookup unavailable');
  return formatPlaceName(await response.json() as Record<string, unknown>);
}
