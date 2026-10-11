// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TripMap } from './TripMap';

const mock = vi.hoisted(() => ({
  events: {} as Record<string, (event: { lngLat: { lat: number; lng: number } }) => void>,
  remove: vi.fn(), flyTo: vi.fn(), markerRemove: vi.fn(),
  points: [] as number[][],
}));
vi.mock('maplibre-gl', () => ({
  setWorkerUrl: vi.fn(),
  Map: class {
    addControl() {}
    on(name: string, callback: typeof mock.events[string]) { mock.events[name] = callback; }
    fitBounds() {}
    getCenter() { return { lat: 32, lng: 77 }; }
    remove = mock.remove;
    flyTo = mock.flyTo;
  },
  NavigationControl: class {},
  LngLatBounds: class {
    empty = true;
    extend() { this.empty = false; }
    isEmpty() { return this.empty; }
  },
  Popup: class { setText() { return this; } },
  Marker: class {
    setLngLat(point: number[]) { mock.points.push(point); return this; }
    setPopup() { return this; }
    addTo() { return this; }
    remove = mock.markerRemove;
  },
}));

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  mock.points.length = 0;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('TripMap', () => {
  it('selects a map point without coordinate inputs', async () => {
    const onSelect = vi.fn();
    await act(async () => root.render(createElement(TripMap, { waypoints: [], onSelect })));
    await act(async () => mock.events.click?.({ lngLat: { lat: 32, lng: 77 } }));
    expect(onSelect).toHaveBeenCalledWith({ lat: 32, lon: 77 });
    expect(container.querySelector('input')).toBeNull();
  });

  it('plots GPS and suggested stops and focuses the requested waypoint', async () => {
    await act(async () => root.render(createElement(TripMap, {
      waypoints: [{ id: 'camp', name: 'Camp', lat: 32, lon: 77, visited: false }],
      current: { lat: 31, lon: 76 }, focusedId: 'camp', ranked: true,
    })));
    expect(mock.points).toEqual([[77, 32], [76, 31]]);
    expect(mock.flyTo).toHaveBeenCalledWith({ center: [77, 32], zoom: 14 });
    await act(async () => root.unmount());
    expect(mock.remove).toHaveBeenCalledOnce();
    expect(mock.markerRemove).toHaveBeenCalledTimes(2);
  });
});
