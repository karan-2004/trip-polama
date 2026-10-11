import { useCallback, useEffect, useRef, useState } from 'react';
import { lookupCurrentPlace } from './placeName';

export interface GeoState {
  lat: number | null;
  lon: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
  placeName?: string;
  resolvingName?: boolean;
  nameError?: string;
}

/** Fetch the device's live location. Coordinates are never entered manually. */
export function useGeolocation() {
  const request = useRef(0);
  const [state, setState] = useState<GeoState>({
    lat: null,
    lon: null,
    accuracy: null,
    error: null,
    loading: false,
  });

  const locate = useCallback(() => {
    request.current += 1;
    const id = request.current;
    if (!('geolocation' in navigator)) {
      setState((s) => ({
        ...s,
        error: 'Geolocation is not supported by this browser.',
        loading: false,
      }));
      return;
    }
    setState({ lat: null, lon: null, accuracy: null, loading: true, error: null });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (request.current !== id) return;
        setState({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
          error: null,
          loading: false,
        });
      },
      (err) => {
        if (request.current === id) setState((s) => ({ ...s, loading: false, error: err.message }));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  }, []);

  useEffect(() => {
    locate();
    return () => { request.current += 1; };
  }, [locate]);

  async function resolveName() {
    if (state.lat === null || state.lon === null || state.resolvingName) return;
    const id = request.current;
    setState((s) => ({ ...s, resolvingName: true, nameError: undefined }));
    try {
      const placeName = await lookupCurrentPlace(state.lat, state.lon);
      if (id !== request.current) return;
      setState((s) => ({ ...s, placeName: placeName ?? undefined, resolvingName: false,
        nameError: placeName ? undefined : 'Place name unavailable; location is still captured.' }));
    } catch {
      if (id === request.current) setState((s) => ({ ...s, resolvingName: false,
        nameError: 'Place lookup unavailable. Your captured location still works.' }));
    }
  }

  return { ...state, locate, resolveName };
}
