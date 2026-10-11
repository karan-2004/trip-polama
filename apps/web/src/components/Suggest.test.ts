// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import type { Trip, Waypoint } from '@trip-polama/core';
import { Suggest } from './Suggest';

vi.mock('@trip-polama/store', () => ({ setWaypointVisited: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../hooks/useLocation', () => ({ useGeolocation: () => ({ lat: 32, lon: 77, accuracy: 10,
  loading: false, error: null, placeName: 'Camp', locate: vi.fn(), resolveName: vi.fn() }) }));
vi.mock('./TripMap', () => ({ TripMap: ({ waypoints, focusedId }: { waypoints: Waypoint[]; focusedId?: string }) =>
  createElement('div', { 'data-testid': 'map', 'data-focused': focusedId }, waypoints.map((point) => point.name).join(', ')) }));

it('plots suggestions, focuses a stop and removes it after marking it visited', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const trip: Trip = { id: 'trip', name: 'Trail', destination: '', startDate: '', endDate: '', currency: 'INR', members: [],
    waypoints: [{ id: 'ridge', name: 'Ridge', lat: 32.01, lon: 77, visited: false }],
    expenses: [], photos: [], memberLocations: [], createdAt: 0, updatedAt: 0 };
  const onChanged = vi.fn();
  try {
    await act(async () => root.render(createElement(Suggest, { trip, onChanged })));
    await act(async () => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(container.querySelector('[data-testid=map]')?.textContent).toBe('Ridge');
    const focus = [...container.querySelectorAll('button')].find((button) => button.textContent === 'Show on map')!;
    await act(async () => focus.click());
    expect(container.querySelector('[data-testid=map]')?.getAttribute('data-focused')).toBe('ridge');
    const visit = [...container.querySelectorAll('button')].find((button) => button.textContent === 'Mark visited')!;
    await act(async () => visit.click());
    expect(onChanged).toHaveBeenCalledOnce();
    await act(async () => root.render(createElement(Suggest, {
      trip: { ...trip, waypoints: trip.waypoints.map((point) => ({ ...point, visited: true })) }, onChanged,
    })));
    expect(container.querySelector('[data-testid=map]')?.textContent).toBe('');
    expect(container.textContent).toContain('All waypoints visited.');
  } finally {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  }
});
