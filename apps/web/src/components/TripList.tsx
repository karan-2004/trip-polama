import { useEffect, useState, type FormEvent } from 'react';
import { createTrip, listTrips } from '@trailbrain/store';
import type { TripRow } from '@trailbrain/store';

export function TripList({ onOpen, refreshKey = 0 }: { onOpen: (tripId: string) => void; refreshKey?: number }) {
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    void listTrips().then(setTrips);
  }, [refreshKey]);

  return (
    <section>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h2>Trips</h2>
        <button className="secondary" onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancel' : 'Create manually'}</button>
      </div>

      {showForm && (
        <TripForm
          onCreated={(t) => {
            setTrips((prev) => [t, ...prev]);
            setShowForm(false);
            onOpen(t.id);
          }}
        />
      )}

      {trips.length === 0 && !showForm ? (
        <div className="empty">
          No trips yet. Create one to start planning — everything stays on this device.
        </div>
      ) : (
        <ul className="list">
          {trips.map((t) => (
            <li key={t.id}>
              <button type="button" className="list-item trip-choice" onClick={() => onOpen(t.id)}>
              <div>
                <div className="title">{t.name}</div>
                <div className="sub">
                  {t.destination} · {t.startDate} → {t.endDate}
                </div>
              </div>
              <span className="badge">{t.members.length || 1} people</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TripForm({ onCreated }: { onCreated: (t: TripRow) => void }) {
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [members, setMembers] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const trip = await createTrip({
      name: name.trim(),
      destination: destination.trim(),
      startDate,
      endDate,
      currency: currency.trim() || 'INR',
      members: members
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean),
    });
    onCreated(trip);
  }

  return (
    <form className="panel" onSubmit={submit}>
      <div className="grid">
        <div className="field">
          <label>Trip name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Annapurna trek" required />
        </div>
        <div className="field">
          <label>Destination</label>
          <input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Himalayas" />
        </div>
        <div className="field">
          <label>Start date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="field">
          <label>End date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div className="field">
          <label>Currency</label>
          <input value={currency} onChange={(e) => setCurrency(e.target.value)} />
        </div>
        <div className="field">
          <label>Members (comma-separated)</label>
          <input value={members} onChange={(e) => setMembers(e.target.value)} placeholder="alice, bob" />
        </div>
      </div>
      <div className="row" style={{ marginTop: '0.75rem' }}>
        <button type="submit">Create trip</button>
      </div>
    </form>
  );
}
