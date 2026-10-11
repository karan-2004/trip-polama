// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addPhoto } from '@trip-polama/store';
import type { Trip } from '@trip-polama/core';
import { Photos } from './Photos';

vi.mock('@trip-polama/store', () => ({ addPhoto: vi.fn().mockResolvedValue({}) }));
const trip: Trip = {
  id: 'trip', name: 'Trail', destination: 'Hills', startDate: '', endDate: '',
  currency: 'INR', members: [], waypoints: [], expenses: [], memberLocations: [],
  createdAt: 0, updatedAt: 0,
  photos: [{ id: 'legacy', filename: 'old.jpg', ts: 1, lat: 12, lon: 34, placeName: 'Old photo place' }],
};
let root: Root;
let container: HTMLDivElement;
const getCurrentPosition = vi.fn();

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } });
  vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:preview'), revokeObjectURL: vi.fn() });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('Photos location privacy', () => {
  it('does not request geolocation or display location controls or legacy tags', async () => {
    await act(async () => root.render(createElement(Photos, { trip, onChanged: vi.fn() })));
    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(container.textContent).not.toContain('Location (live');
    expect(container.textContent).not.toContain('Old photo place');
    expect(container.textContent).not.toContain('Find place name');
    expect(container.querySelector('#photo-upload')).not.toBeNull();
  });

  it('saves the selected image without app location fields', async () => {
    const onChanged = vi.fn();
    await act(async () => root.render(createElement(Photos, { trip, onChanged })));
    const file = new File(['image'], 'photo.jpg', { type: 'image/jpeg' });
    const input = container.querySelector<HTMLInputElement>('#photo-upload')!;
    Object.defineProperty(input, 'files', { value: [file] });
    await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })));
    await act(async () => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    const saved = vi.mocked(addPhoto).mock.calls[0]?.[0];
    expect(saved?.image).toBe(file);
    expect(saved).not.toHaveProperty('lat');
    expect(saved).not.toHaveProperty('lon');
    expect(saved).not.toHaveProperty('placeName');
    expect(onChanged).toHaveBeenCalledOnce();
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });
});
