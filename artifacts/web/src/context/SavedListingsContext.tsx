import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

interface SavedListingsContextValue {
  savedIds: string[];
  toggleSaved: (id: string) => void;
  isSaved: (id: string) => boolean;
}

const SavedListingsContext = createContext<SavedListingsContextValue | null>(null);

const STORAGE_KEY = "directory_saved_listings";

function loadFromStorage(): string[] {
  try {
    const item = window.localStorage.getItem(STORAGE_KEY);
    return item ? (JSON.parse(item) as string[]) : [];
  } catch {
    return [];
  }
}

export function SavedListingsProvider({ children }: { children: ReactNode }) {
  const [savedIds, setSavedIds] = useState<string[]>(loadFromStorage);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(savedIds));
    } catch {
      // ignore write errors
    }
  }, [savedIds]);

  const toggleSaved = (id: string) => {
    setSavedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const isSaved = (id: string) => savedIds.includes(id);

  return (
    <SavedListingsContext.Provider value={{ savedIds, toggleSaved, isSaved }}>
      {children}
    </SavedListingsContext.Provider>
  );
}

export function useSavedListings(): SavedListingsContextValue {
  const ctx = useContext(SavedListingsContext);
  if (!ctx) throw new Error("useSavedListings must be used within SavedListingsProvider");
  return ctx;
}
