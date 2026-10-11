import type { GeoState } from '../hooks/useLocation';

export function LocationField({ geo, onRefresh }: {
  geo: GeoState & { resolveName: () => Promise<void> }; onRefresh: () => void;
}) {
  if (geo.loading) {
    return <div className="muted">Locating…</div>;
  }
  if (geo.error) {
    return (
      <div className="row" style={{ alignItems: 'center' }}>
        <span className="muted">{geo.error}</span>
        <button type="button" className="secondary" onClick={onRefresh}>
          Retry
        </button>
      </div>
    );
  }
  if (geo.lat === null || geo.lon === null) {
    return (
      <div className="row" style={{ alignItems: 'center' }}>
        <span className="muted">No location captured yet.</span>
        <button type="button" className="secondary" onClick={onRefresh}>
          Use my location
        </button>
      </div>
    );
  }
  return (
    <div className="row" style={{ alignItems: 'center' }}>
      <span>{geo.placeName ?? 'Current location captured'}</span>
      <span className="badge">±{Math.round(geo.accuracy ?? 0)}m</span>
      <button type="button" className="secondary" onClick={onRefresh}>
        Refresh
      </button>
      {!geo.placeName && (
        <div>
          <button type="button" className="secondary" disabled={geo.resolvingName}
            onClick={() => void geo.resolveName()}>
            {geo.resolvingName ? 'Finding place name...' : 'Find place name (online)'}
          </button>
          <p className="muted">Lookup shares this device's location with BigDataCloud.</p>
        </div>
      )}
      {geo.nameError && <span role="status" className="muted">{geo.nameError}</span>}
    </div>
  );
}
