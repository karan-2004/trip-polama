import { lazy, Suspense, useEffect, useState } from 'react';
import { ChatHub } from './components/ChatHub';
import type { ManualView } from '@trailbrain/core';
const TripDetail = lazy(() => import('./components/TripDetail').then((module) => ({ default: module.TripDetail })));

export type View = { type: 'list' } | { type: 'trip'; tripId: string; tab: ManualView };

function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

export default function App() {
  const [view, setView] = useState<View>({ type: 'list' });
  const online = useOnline();

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <h1>TrailBrain</h1>
          <span className="tagline">split-brain trip manager</span>
        </div>
        <div className="brains">
          <span className="chip on">local brain · on</span>
          <span className={`chip ${online ? 'on' : 'off'}`}>
            {online ? 'Network available' : 'Offline'}
          </span>
        </div>
      </header>

      {view.type === 'list' ? (
        <ChatHub onOpenManual={(tripId, tab) => setView({ type: 'trip', tripId, tab })} />
      ) : (
        <Suspense fallback={<p role="status">Opening trip tools...</p>}>
          <TripDetail key={`${view.tripId}-${view.tab}`} tripId={view.tripId} initialTab={view.tab} onBack={() => setView({ type: 'list' })} />
        </Suspense>
      )}
    </div>
  );
}
