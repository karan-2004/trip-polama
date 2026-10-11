// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { addWaypoint } from '@trip-polama/store';
import type { Trip } from '@trip-polama/core';
import { Waypoints } from './Waypoints';

vi.mock('@trip-polama/store', () => ({ addWaypoint: vi.fn().mockResolvedValue({}), setWaypointVisited: vi.fn() }));
vi.mock('../hooks/useLocation', () => ({ useGeolocation: () => ({ lat: null, lon: null, loading: false, error: null, locate: vi.fn(), resolveName: vi.fn() }) }));
vi.mock('./TripMap', () => ({ TripMap: ({ onSelect }: { onSelect: (point: { lat: number; lon: number }) => void }) =>
  createElement('button', { type: 'button', onClick: () => onSelect({ lat: 32, lon: 77 }) }, 'Select map stop') }));

it('saves a map-selected waypoint even when device GPS is unavailable', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const trip: Trip = { id: 'trip', name: 'Trail', destination: '', startDate: '', endDate: '', currency: 'INR', members: [],
    waypoints: [], expenses: [], photos: [], memberLocations: [], createdAt: 0, updatedAt: 0 };
  const onChanged = vi.fn();
  try {
    await act(async () => root.render(createElement(Waypoints, { trip, onChanged })));
    const name = container.querySelector('input')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(name, 'Ridge');
      name.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const pick = [...container.querySelectorAll('button')].find((button) => button.textContent === 'Select map stop')!;
    await act(async () => pick.click());
    await act(async () => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(addWaypoint).toHaveBeenCalledWith(expect.objectContaining({ name: 'Ridge', lat: 32, lon: 77, placeName: 'Ridge' }));
    expect(onChanged).toHaveBeenCalledOnce();
  } finally {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  }
});
