import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SAMPLE_LISTINGS, Listing } from '@/constants/data';

const SAVED_KEY = '@directory_saved_ids';

interface DirectoryContextValue {
  listings: Listing[];
  savedIds: Set<string>;
  selectedCategory: string;
  searchQuery: string;
  setSelectedCategory: (cat: string) => void;
  setSearchQuery: (q: string) => void;
  toggleSave: (id: string) => void;
  isSaved: (id: string) => boolean;
  filteredListings: Listing[];
  savedListings: Listing[];
  featuredListings: Listing[];
}

const DirectoryContext = createContext<DirectoryContextValue | null>(null);

export function DirectoryProvider({ children }: { children: React.ReactNode }) {
  const [listings] = useState<Listing[]>(SAMPLE_LISTINGS);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    AsyncStorage.getItem(SAVED_KEY).then((raw) => {
      if (raw) {
        try {
          const ids: string[] = JSON.parse(raw);
          setSavedIds(new Set(ids));
        } catch {}
      }
    });
  }, []);

  const toggleSave = useCallback((id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      AsyncStorage.setItem(SAVED_KEY, JSON.stringify(Array.from(next)));
      return next;
    });
  }, []);

  const isSaved = useCallback((id: string) => savedIds.has(id), [savedIds]);

  const filteredListings = useMemo(() => {
    let result = listings;
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
          l.city.toLowerCase().includes(q) ||
          l.category.toLowerCase().includes(q),
      );
    }
    return result;
  }, [listings, selectedCategory, searchQuery]);

  const savedListings = useMemo(
    () => listings.filter((l) => savedIds.has(l.id)),
    [listings, savedIds],
  );

  const featuredListings = useMemo(
    () => listings.filter((l) => l.featured),
    [listings],
  );

  const value: DirectoryContextValue = {
    listings,
    savedIds,
    selectedCategory,
    searchQuery,
    setSelectedCategory,
    setSearchQuery,
    toggleSave,
    isSaved,
    filteredListings,
    savedListings,
    featuredListings,
  };

  return <DirectoryContext.Provider value={value}>{children}</DirectoryContext.Provider>;
}

export function useDirectory() {
  const ctx = useContext(DirectoryContext);
  if (!ctx) throw new Error('useDirectory must be used within DirectoryProvider');
  return ctx;
}
