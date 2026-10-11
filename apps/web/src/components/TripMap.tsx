import { useEffect, useRef, useState } from 'react';
import { Map as LibreMap, Marker, Popup, NavigationControl, LngLatBounds, setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Waypoint } from '@trailbrain/core';

setWorkerUrl(workerUrl);

export interface MapPoint { lat: number; lon: number }

export function TripMap({ waypoints, current, selected, onSelect, focusedId, ranked = false }: {
  waypoints: Waypoint[];
  current?: MapPoint;
  selected?: MapPoint;
  onSelect?: (point: MapPoint) => void;
  focusedId?: string;
  ranked?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LibreMap>();
  const select = useRef(onSelect);
  const fitted = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => { select.current = onSelect; }, [onSelect]);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    if (!container.current) return;
    let instance: LibreMap | undefined;
    try {
      instance = new LibreMap({
        container: container.current,
        style: import.meta.env.VITE_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/liberty',
        center: [0, 20], zoom: 1.5,
        attributionControl: { compact: false },
      });
      map.current = instance;
      instance.addControl(new NavigationControl(), 'top-right');
      instance.on('click', (event) => select.current?.({ lat: event.lngLat.lat, lon: event.lngLat.lng }));
      instance.on('error', () => setError('Map unavailable. Check your connection; saved stops and GPS still work.'));
      instance.on('load', () => setError(null));
    } catch {
      setError('This browser could not display the map. Saved stops and GPS still work.');
    }
    return () => {
      instance?.remove();
      map.current = undefined;
      fitted.current = false;
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    const markers: Marker[] = [];
    const bounds = new LngLatBounds();
    const pin = (point: MapPoint, title: string, kind: string) => {
      const element = document.createElement('button');
      element.type = 'button';
      element.className = `map-pin ${kind}`;
      element.textContent = title;
      element.setAttribute('aria-label', title);
      element.addEventListener('click', (event) => event.stopPropagation());
      markers.push(new Marker({ element }).setLngLat([point.lon, point.lat])
        .setPopup(new Popup({ offset: 18 }).setText(title)).addTo(instance));
      bounds.extend([point.lon, point.lat]);
    };
    waypoints.forEach((point, index) => pin(point,
      `${ranked ? `${index + 1}. ` : ''}${point.name}`, point.visited ? 'visited' : 'waypoint'));
    if (current) pin(current, 'You are here', 'current');
    if (selected) pin(selected, 'Selected stop', 'selected');
    if (!fitted.current && !bounds.isEmpty()) {
      instance.fitBounds(bounds, { padding: 65, maxZoom: 14, duration: 0 });
      fitted.current = true;
    }
    return () => markers.forEach((marker) => marker.remove());
  }, [waypoints, current, selected, ranked]);

  useEffect(() => {
    const point = waypoints.find((waypoint) => waypoint.id === focusedId);
    if (point) map.current?.flyTo({ center: [point.lon, point.lat], zoom: 14 });
  }, [focusedId, waypoints]);

  return (
    <section className="trip-map-panel" aria-label={onSelect ? 'Choose waypoint on map' : 'Suggested stops map'}>
      {onSelect && <p className="muted">Tap the map to choose a stop, or pan and select the map center.</p>}
      <div ref={container} className="trip-map" />
      {onSelect && <button type="button" className="secondary" onClick={() => {
        const center = map.current?.getCenter();
        if (center) onSelect({ lat: center.lat, lon: center.lng });
      }}>Select map center</button>}
      {error && <p role="status" className="photo-error">{error}</p>}
      <p className="muted">{online ? 'Online map' : 'Offline: map tiles may be unavailable'}
        {' '}· Tiles from OpenFreeMap; offline map downloads are not available yet.</p>
      <p className="muted">Pins show stops, not walking routes. GPS accuracy and trail conditions may vary.</p>
    </section>
  );
}
