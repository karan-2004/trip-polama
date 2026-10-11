import { haversineKm } from '@trailbrain/core';

export default function App() {
  const km = haversineKm(13.0, 77.6, 13.5, 77.6);
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <h1>TrailBrain</h1>
      <p>Offline-first, split-brain trip manager for outdoor trips.</p>
      <p>
        Core wired: the local brain computes distance on-device — 0.5&deg; north is{' '}
        {km.toFixed(1)} km.
      </p>
    </main>
  );
}
