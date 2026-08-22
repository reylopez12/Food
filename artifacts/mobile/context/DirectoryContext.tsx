import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { listings } from '@workspace/api-client-react';
import type { Venue } from '@workspace/api-client-react';
import * as Location from 'expo-location';

export type { Venue };

// Alias for backwards-compat within mobile components
export type Listing = Venue;

const SAVED_KEY    = '@directory_saved_ids';
const RADIUS_KEY   = '@directory_preferred_radius';

export const RADIUS_OPTIONS = [1, 5, 10, 25] as const;
export type RadiusMiles = typeof RADIUS_OPTIONS[number];
export type LocationStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable';

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
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Venues imported without GPS default to (0, 0) — treat as no-data. */
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

interface DirectoryContextValue {
  listings: Venue[];
  isLoading: boolean;
  savedIds: Set<string>;
  selectedCategory: string;
  searchQuery: string;
  cityQuery: string;
  setSelectedCategory: (cat: string) => void;
  setSearchQuery: (q: string) => void;
  setCityQuery: (city: string) => void;
  toggleSave: (id: string) => void;
  isSaved: (id: string) => boolean;
  filteredListings: Venue[];
  savedListings: Venue[];
  featuredListings: Venue[];
  // Location / distance
  locationStatus: LocationStatus;
  userLat: number | null;
  userLng: number | null;
  preferredRadius: RadiusMiles | null;
  requestLocation: () => Promise<void>;
  clearLocation: () => void;
  setPreferredRadius: (r: RadiusMiles | null) => void;
}

const DirectoryContext = createContext<DirectoryContextValue | null>(null);

export function DirectoryProvider({ children }: { children: React.ReactNode }) {
  const { data: allListings = [], isLoading } = useQuery({
    queryKey: ['/api/listings'],
    queryFn: ({ signal }) => listings({ signal }),
  });

  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cityQuery, setCityQuery] = useState('');

  // Location state
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [preferredRadius, setPreferredRadiusState] = useState<RadiusMiles | null>(null);

  // Load persisted data on mount
  useEffect(() => {
    AsyncStorage.multiGet([SAVED_KEY, RADIUS_KEY]).then(([[, savedRaw], [, radiusRaw]]) => {
      if (savedRaw) {
        try { setSavedIds(new Set(JSON.parse(savedRaw))); } catch {}
      }
      if (radiusRaw) {
        const n = Number(radiusRaw);
        if ((RADIUS_OPTIONS as readonly number[]).includes(n)) {
          setPreferredRadiusState(n as RadiusMiles);
        }
      }
    });
  }, []);

  const toggleSave = useCallback((id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      AsyncStorage.setItem(SAVED_KEY, JSON.stringify(Array.from(next)));
      return next;
    });
  }, []);

  const isSaved = useCallback((id: string) => savedIds.has(id), [savedIds]);

  const requestLocation = useCallback(async () => {
    setLocationStatus('requesting');
    try {
      if (Platform.OS === 'web') {
        if (!navigator.geolocation) {
          setLocationStatus('unavailable');
          return;
        }
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 10_000,
          });
        });
        setUserLat(position.coords.latitude);
        setUserLng(position.coords.longitude);
        setLocationStatus('granted');
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationStatus('denied');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserLat(pos.coords.latitude);
      setUserLng(pos.coords.longitude);
      setLocationStatus('granted');
    } catch {
      setLocationStatus('denied');
    }
  }, []);

  const clearLocation = useCallback(() => {
    setUserLat(null);
    setUserLng(null);
    setLocationStatus('idle');
  }, []);

  const setPreferredRadius = useCallback((r: RadiusMiles | null) => {
    setPreferredRadiusState(r);
    if (r === null) AsyncStorage.removeItem(RADIUS_KEY);
    else AsyncStorage.setItem(RADIUS_KEY, String(r));
  }, []);

  const distanceActive =
    locationStatus === 'granted' &&
    userLat !== null &&
    userLng !== null &&
    preferredRadius !== null;

  const filteredListings = useMemo(() => {
    let result = allListings;

    if (selectedCategory !== 'all') {
      result = result.filter((l) => l.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q) ||
          l.tags.some((t) => t.toLowerCase().includes(q)) ||
          l.neighborhood.toLowerCase().includes(q) ||
          l.city.toLowerCase().includes(q) ||
          l.category.toLowerCase().includes(q),
      );
    }

    if (cityQuery.trim()) {
      const city = cityQuery.toLowerCase().trim();
      result = result.filter((l) => l.city.toLowerCase().includes(city));
    }

    if (distanceActive) {
      result = result.filter((l) => {
        if (!hasValidCoordinates(l.lat, l.lng)) return false;
        return haversineDistanceMi(userLat!, userLng!, l.lat, l.lng) <= preferredRadius!;
      });
    }

    return result;
  }, [allListings, selectedCategory, searchQuery, cityQuery, distanceActive, userLat, userLng, preferredRadius]);

  const savedListings = useMemo(
    () => allListings.filter((l) => savedIds.has(l.id)),
    [allListings, savedIds],
  );

  const featuredListings = useMemo(
    () => allListings.filter((l) => l.featured),
    [allListings],
  );

  const value: DirectoryContextValue = {
    listings: allListings,
    isLoading,
    savedIds,
    selectedCategory,
    searchQuery,
    cityQuery,
    setSelectedCategory,
    setSearchQuery,
    setCityQuery,
    toggleSave,
    isSaved,
    filteredListings,
    savedListings,
    featuredListings,
    locationStatus,
    userLat,
    userLng,
    preferredRadius,
    requestLocation,
    clearLocation,
    setPreferredRadius,
  };

  return <DirectoryContext.Provider value={value}>{children}</DirectoryContext.Provider>;
}

export function useDirectory() {
  const ctx = useContext(DirectoryContext);
  if (!ctx) throw new Error('useDirectory must be used within DirectoryProvider');
  return ctx;
}
