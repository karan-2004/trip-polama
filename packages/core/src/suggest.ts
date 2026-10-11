import type { TerrainKind, Trip, Waypoint, Weather, Pace } from './types';
import { haversineKm } from './geo';

const WEATHER_SAFETY: Record<TerrainKind, Record<Weather, number>> = {
  peak: { clear: 0, cloudy: 1, rain: 4, fog: 5, snow: 6 },
  viewpoint: { clear: 0, cloudy: 1, rain: 2, fog: 4, snow: 4 },
  forest: { clear: 0, cloudy: 0, rain: 1, fog: 1, snow: 2 },
  waterfall: { clear: 0, cloudy: 0, rain: 0, fog: 1, snow: 1 },
  camp: { clear: 0, cloudy: 0, rain: 2, fog: 2, snow: 4 },
};

const KIND_HINTS: TerrainKind[] = ['peak', 'viewpoint', 'forest', 'waterfall', 'camp'];

const PACE_KMH: Record<Pace, number> = { slow: 3, moderate: 4.5, fast: 6 };

function kindOf(wp: Waypoint): TerrainKind {
  const text = `${wp.name} ${wp.note ?? ''}`.toLowerCase();
  for (const k of KIND_HINTS) {
    if (text.includes(k)) return k;
  }
  if (wp.elevation !== undefined && wp.elevation > 1800) return 'peak';
  return 'viewpoint';
}

export interface Suggestion {
  waypoint: Waypoint;
  reason: string;
  score: number;
  distanceKm: number;
  travelHours: number;
}

export interface SuggestOptions {
  weather?: Weather;
  daylightHours?: number;
  pace?: Pace;
}

/**
 * Rank a trip's unvisited waypoints for the next stop — fully offline.
 * Folds weather, daylight budget, elevation gain and pace into a single score.
 */
export function suggestNext(
  trip: Trip,
  currentLat: number,
  currentLon: number,
  options: SuggestOptions = {},
): Suggestion[] {
  const weather = options.weather ?? 'clear';
  const daylightHours = options.daylightHours ?? 4;
  const pace = options.pace ?? 'moderate';

  const candidates = trip.waypoints.filter((w) => !w.visited);
  if (candidates.length === 0) return [];

  const scored: Suggestion[] = candidates.map((wp) => {
    const distanceKm = haversineKm(currentLat, currentLon, wp.lat, wp.lon);
    const kind = kindOf(wp);
    const weatherPenalty = WEATHER_SAFETY[kind][weather] ?? 2;

    const travelHours = distanceKm / PACE_KMH[pace];
    const daylightPenalty = Math.max(0, travelHours - daylightHours) * 2;

    const elevationPenalty =
      wp.elevation !== undefined ? Math.max(0, (wp.elevation - 1200) / 500) : 0;

    const score = distanceKm * 1.5 + weatherPenalty * 3 + daylightPenalty + elevationPenalty * 2;

    const bits = [`${distanceKm.toFixed(1)} km away (~${travelHours.toFixed(1)}h)`];
    if (weatherPenalty > 0) {
      bits.push(
        weather === 'fog' || weather === 'rain' || weather === 'snow'
          ? `poor visibility in ${weather}`
          : `ok in ${weather}`,
      );
    }
    if (kind === 'waterfall') bits.push('waterfall runs best after rain');
    if (wp.elevation !== undefined) bits.push(`elevation ${wp.elevation}m`);

    return { waypoint: wp, reason: bits.join(', '), score, distanceKm, travelHours };
  });

  return scored.sort((a, b) => a.score - b.score).slice(0, 3);
}
