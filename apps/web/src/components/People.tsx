import { useState, type FormEvent } from 'react';
import type { Trip } from '@trip-polama/core';
import { haversineKm } from '@trip-polama/core';
import { upsertMemberLocation } from '@trip-polama/store';
import { useGeolocation } from '../hooks/useLocation';
import { LocationField } from './LocationField';

export function People({ trip, onChanged }: { trip: Trip; onChanged: () => void }) {
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const geo = useGeolocation();

  const members = trip.members.length ? trip.members : ['me'];

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name || geo.lat === null || geo.lon === null) return;
    await upsertMemberLocation({
      tripId: trip.id,
      name,
      lat: geo.lat,
      lon: geo.lon,
      placeName: geo.placeName,
      note: note.trim() || undefined,
      ts: Date.now(),
    });
    setNote('');
    onChanged();
  }

  const locations = [...trip.memberLocations].sort((a, b) => b.ts - a.ts);

  return (
    <div>
      <form className="panel" onSubmit={submit}>
        <div className="grid">
          <div className="field">
            <label>Who</label>
            <select value={name} onChange={(e) => setName(e.target.value)}>
              <option value="">— select —</option>
              {members.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Note</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="at the bridge" />
          </div>
        </div>
        <div className="field" style={{ marginTop: '0.75rem' }}>
          <label>Location (live)</label>
          <LocationField geo={geo} onRefresh={geo.locate} />
        </div>
        <div className="row" style={{ marginTop: '0.75rem' }}>
          <button type="submit" disabled={!name || geo.lat === null || geo.lon === null}>
            Check in here
          </button>
        </div>
      </form>

      {locations.length === 0 ? (
        <div className="empty">No check-ins yet. Each check-in pins the person's live location.</div>
      ) : (
        <ul className="list">
          {locations.map((l) => (
            <li key={`${l.name}-${l.ts}`} className="list-item">
              <div>
                <div className="title">{l.name}</div>
                <div className="sub mono">
                  {l.placeName ?? 'Saved check-in location'}
                  {l.note ? ` · ${l.note}` : ''} · {new Date(l.ts).toLocaleTimeString()}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {locations.length >= 2 && (
        <div className="panel">
          <h2>Separation</h2>
          {(() => {
            const latest = new Map<string, (typeof locations)[number]>();
            for (const l of locations) {
              if (!latest.has(l.name)) latest.set(l.name, l);
            }
            const arr = [...latest.values()];
            const rows: { a: string; b: string; km: number }[] = [];
            for (let i = 0; i < arr.length; i++) {
              for (let j = i + 1; j < arr.length; j++) {
                rows.push({
                  a: arr[i]!.name,
                  b: arr[j]!.name,
                  km: haversineKm(arr[i]!.lat, arr[i]!.lon, arr[j]!.lat, arr[j]!.lon),
                });
              }
            }
            return rows.map((r) => (
              <div key={`${r.a}-${r.b}`} className="mono">
                {r.a} ↔ {r.b}: {r.km.toFixed(1)} km
              </div>
            ));
          })()}
        </div>
      )}
    </div>
  );
}
