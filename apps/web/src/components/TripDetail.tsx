import { useCallback, useEffect, useState } from 'react';
import { getTripFull } from '@trip-polama/store';
import type { Trip } from '@trip-polama/core';
import type { ManualView } from '@trip-polama/core';
import { Waypoints } from './Waypoints';
import { Expenses } from './Expenses';
import { Suggest } from './Suggest';
import { People } from './People';
import { Photos } from './Photos';

type Tab = ManualView;

const TABS: { key: Tab; label: string }[] = [
  { key: 'waypoints', label: 'Waypoints' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'suggest', label: 'Next up' },
  { key: 'people', label: 'People' },
  { key: 'photos', label: 'Photos' },
];

export function TripDetail({ tripId, onBack, initialTab = 'waypoints' }: { tripId: string; onBack: () => void; initialTab?: ManualView }) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [tab, setTab] = useState<Tab>(initialTab);

  const load = useCallback(async () => {
    const t = await getTripFull(tripId);
    setTrip(t);
  }, [tripId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!trip) return <div className="empty">Loading…</div>;

  return (
    <section>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <button className="ghost" onClick={onBack}>
            Back to trip chat
          </button>
          <h2 style={{ marginTop: '0.5rem' }}>{trip.name}</h2>
          <div className="muted">
            {trip.destination} · {trip.startDate} → {trip.endDate}
          </div>
        </div>
      </div>

      <div className="tabs" style={{ marginTop: '1rem' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'waypoints' && <Waypoints trip={trip} onChanged={load} />}
      {tab === 'expenses' && <Expenses trip={trip} onChanged={load} />}
      {tab === 'suggest' && <Suggest trip={trip} onChanged={load} />}
      {tab === 'people' && <People trip={trip} onChanged={load} />}
      {tab === 'photos' && <Photos trip={trip} onChanged={load} />}
    </section>
  );
}
