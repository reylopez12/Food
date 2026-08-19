import { useState, useCallback } from 'react';

const RADIUS_KEY = 'bay-bites-preferred-radius';
let cachedLocation: { lat: number; lng: number } | null = null;

export const RADIUS_OPTIONS = [1, 5, 10, 25] as const;
export type RadiusMiles = typeof RADIUS_OPTIONS[number];

/** Haversine great-circle distance in miles between two lat/lng points. */
export function haversineDistanceMi(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Imported venues without coordinates use (0, 0), which is not a usable location. */
export function hasValidCoordinates(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

export type LocationStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable';

interface NearMeState {
  status: LocationStatus;
  userLat: number | null;
  userLng: number | null;
  radius: RadiusMiles | null;
}

function loadRadius(): RadiusMiles | null {
  try {
    const saved = localStorage.getItem(RADIUS_KEY);
    const n = Number(saved);
    return (RADIUS_OPTIONS as readonly number[]).includes(n) ? (n as RadiusMiles) : null;
  } catch {
    return null;
  }
}

export function useNearMe() {
  const [state, setState] = useState<NearMeState>(() => ({
    status: cachedLocation ? 'granted' : 'idle',
    userLat: cachedLocation?.lat ?? null,
    userLng: cachedLocation?.lng ?? null,
    radius: loadRadius(),
  }));

  const requestLocation = useCallback(() => {
    cachedLocation = null;
    setState(s => ({
      ...s,
      status: 'requesting',
      userLat: null,
      userLng: null,
    }));
    if (!navigator.geolocation) {
      setState(s => ({ ...s, status: 'unavailable' }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const location = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        cachedLocation = location;
        setState(s => ({
          ...s,
          status: 'granted',
          userLat: location.lat,
          userLng: location.lng,
        }));
      },
      () => {
        setState(s => ({ ...s, status: 'denied' }));
      },
      { timeout: 10_000 },
    );
  }, []);

  const clearLocation = useCallback(() => {
    cachedLocation = null;
    setState(s => ({ ...s, status: 'idle', userLat: null, userLng: null }));
  }, []);

  const setRadius = useCallback((r: RadiusMiles | null) => {
    setState(s => ({ ...s, radius: r }));
    try {
      if (r === null) localStorage.removeItem(RADIUS_KEY);
      else localStorage.setItem(RADIUS_KEY, String(r));
    } catch {}
  }, []);

  return { ...state, requestLocation, clearLocation, setRadius };
}
