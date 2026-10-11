import { useState, type FormEvent } from 'react';
import type { Trip } from '@trip-polama/core';
import { addWaypoint, setWaypointVisited } from '@trip-polama/store';
import { useGeolocation } from '../hooks/useLocation';
import { LocationField } from './LocationField';
import { TripMap, type MapPoint } from './TripMap';

export function Waypoints({ trip, onChanged }: { trip: Trip; onChanged: () => void }) {
  const [name, setName] = useState('');
  const [elevation, setElevation] = useState('');
  const [note, setNote] = useState('');
  const [selected, setSelected] = useState<MapPoint>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const geo = useGeolocation();
  const current = geo.lat !== null && geo.lon !== null ? { lat: geo.lat, lon: geo.lon } : undefined;
  const point = selected ?? current;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !point || saving) return;
    setSaving(true);
    setError(null);
    try {
      await addWaypoint({
      tripId: trip.id,
      name: name.trim(),
      lat: point.lat,
      lon: point.lon,
      placeName: selected ? name.trim() : geo.placeName,
      elevation: elevation === '' ? undefined : Number(elevation),
      note: note.trim() || undefined,
      visited: false,
    });
    setName('');
    setElevation('');
    setNote('');
    setSelected(undefined);
    onChanged();
    } catch {
      setError('Could not save the waypoint. Your selection is still here; try again.');
    } finally { setSaving(false); }
  }

  const pending = trip.waypoints.filter((w) => !w.visited);
  const done = trip.waypoints.filter((w) => w.visited);

  return (
    <div>
      <form className="panel" onSubmit={submit}>
        <div className="grid">
          <div className="field">
            <label>Waypoint name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Base camp" required />
          </div>
          <div className="field">
            <label>Elevation (m, optional)</label>
            <input value={elevation} onChange={(e) => setElevation(e.target.value)} placeholder="2400" />
          </div>
        </div>
        <div className="field" style={{ marginTop: '0.75rem' }}>
          <label>Note (hint at terrain, e.g. "forest trail" or "summit peak")</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="field" style={{ marginTop: '0.75rem' }}>
          <label>Stop location</label>
          {selected ? <div className="row"><span>Point selected on map</span>
            <button type="button" className="secondary" onClick={() => {
              setSelected(undefined); geo.locate();
            }}>Use my current location instead</button></div>
            : <LocationField geo={geo} onRefresh={geo.locate} />}
        </div>
        <TripMap waypoints={trip.waypoints} current={current} selected={selected}
          onSelect={(location) => { if (!saving) setSelected(location); }} />
        {error && <p role="alert" className="photo-error">{error}</p>}
        <div className="row" style={{ marginTop: '0.75rem' }}>
          <button type="submit" disabled={!point || saving}>
            {saving ? 'Saving...' : 'Add waypoint'}
          </button>
        </div>
      </form>

      <h2>On the trail ({pending.length} left)</h2>
      {trip.waypoints.length === 0 ? (
        <div className="empty">Choose a stop on the map or use your current location.</div>
      ) : (
        <ul className="list">
          {[...pending, ...done].map((w) => (
            <li key={w.id} className="list-item">
              <div>
                <div className="title">
                  {w.name} {w.visited && <span className="check">✓ visited</span>}
                </div>
                <div className="sub mono">
                  {w.placeName ?? 'Saved location'}
                  {w.elevation !== undefined ? ` · ${w.elevation}m` : ''}
                  {w.note ? ` · ${w.note}` : ''}
                </div>
              </div>
              <button
                className="visit-btn"
                onClick={async () => {
                  await setWaypointVisited(trip.id, w.id, !w.visited);
                  onChanged();
                }}
              >
                {w.visited ? 'Undo' : 'Mark visited'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
