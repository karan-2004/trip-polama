import { useState, type FormEvent } from 'react';
import type { Trip, Weather, Pace } from '@trip-polama/core';
import { suggestNext } from '@trip-polama/core';
import { setWaypointVisited } from '@trip-polama/store';
import { useGeolocation } from '../hooks/useLocation';
import { LocationField } from './LocationField';
import { TripMap } from './TripMap';

export function Suggest({ trip, onChanged }: { trip: Trip; onChanged: () => void }) {
  const [weather, setWeather] = useState<Weather>('clear');
  const [daylight, setDaylight] = useState('4');
  const [pace, setPace] = useState<Pace>('moderate');
  const [requested, setRequested] = useState(false);
  const [focusedId, setFocusedId] = useState<string>();
  const geo = useGeolocation();

  function compute() {
    if (geo.lat === null || geo.lon === null) return;
    setRequested(true);
  }

  function run(e?: FormEvent) {
    e?.preventDefault();
    compute();
  }

  const ready = geo.lat !== null && geo.lon !== null;
  const current = ready ? { lat: geo.lat!, lon: geo.lon! } : undefined;
  const result = requested && current ? suggestNext(trip, current.lat, current.lon, {
    weather, daylightHours: Number(daylight), pace,
  }) : null;

  return (
    <div>
      <form className="panel" onSubmit={run}>
        <div className="field">
          <label>Location (live)</label>
          <LocationField geo={geo} onRefresh={geo.locate} />
        </div>
        <div className="grid" style={{ marginTop: '0.75rem' }}>
          <div className="field">
            <label>Weather</label>
            <select value={weather} onChange={(e) => setWeather(e.target.value as Weather)}>
              {(['clear', 'cloudy', 'rain', 'fog', 'snow'] as Weather[]).map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Daylight left (hours)</label>
            <input type="number" min="0" max="24" value={daylight} onChange={(e) => setDaylight(e.target.value)} />
          </div>
          <div className="field">
            <label>Pace</label>
            <select value={pace} onChange={(e) => setPace(e.target.value as Pace)}>
              <option value="slow">slow</option>
              <option value="moderate">moderate</option>
              <option value="fast">fast</option>
            </select>
          </div>
        </div>
        <div className="row" style={{ marginTop: '0.75rem' }}>
          <button type="submit" disabled={!ready}>
            Suggest next
          </button>
        </div>
      </form>

      <TripMap current={current} ranked={result !== null} focusedId={focusedId}
        waypoints={result ? result.map((item) => item.waypoint) : trip.waypoints.filter((point) => !point.visited)} />

      {result === null ? (
        <div className="empty">We will suggest the next stop from your live location.</div>
      ) : result.length === 0 ? (
        <div className="empty">{trip.waypoints.length ? 'All waypoints visited.' : 'Add waypoints to see next-stop suggestions.'}</div>
      ) : (
        <div>
          <h2>Suggested next</h2>
          {result.map((s) => (
            <div key={s.waypoint.id} className="suggestion">
              <div className="row" style={{ alignItems: 'center' }}>
                <strong>{s.waypoint.name}</strong>
                <button type="button" className="secondary" onClick={() => setFocusedId(s.waypoint.id)}>Show on map</button>
                <button
                  className="visit-btn"
                  onClick={async () => {
                    await setWaypointVisited(trip.id, s.waypoint.id, true);
                    onChanged();
                  }}
                >
                  Mark visited
                </button>
              </div>
              <div className="reason">{s.reason}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
