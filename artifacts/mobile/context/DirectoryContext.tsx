import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { listings } from '@workspace/api-client-react';
import type { Venue } from '@workspace/api-client-react';

export type { Venue };

// Alias for backwards-compat within mobile components
export type Listing = Venue;

const SAVED_KEY = '@directory_saved_ids';

interface DirectoryContextValue {
  listings: Venue[];
  isLoading: boolean;
  savedIds: Set<string>;
  selectedCategory: string;
  searchQuery: string;
  setSelectedCategory: (cat: string) => void;
  setSearchQuery: (q: string) => void;
  toggleSave: (id: string) => void;
  isSaved: (id: string) => boolean;
  filteredListings: Venue[];
  savedListings: Venue[];
  featuredListings: Venue[];
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
          l.city.toLowerCase().includes(q) ||
          l.category.toLowerCase().includes(q),
      );
    }
    return result;
  }, [allListings, selectedCategory, searchQuery]);

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
