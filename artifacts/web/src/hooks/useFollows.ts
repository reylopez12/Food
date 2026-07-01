import { useState, useEffect, useCallback } from "react";

const API_BASE = "/api";

async function fetchFollowing(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/follows`, { credentials: "include" });
  if (!res.ok) return [];
  const data = await res.json();
  return data.following ?? [];
}

export function useFollows(isAuthenticated: boolean) {
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setFollowing(new Set());
      return;
    }
    setLoading(true);
    fetchFollowing()
      .then((ids) => setFollowing(new Set(ids)))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const isFollowing = useCallback(
    (venueId: string) => following.has(venueId),
    [following]
  );

  const toggleFollow = useCallback(
    async (venueId: string): Promise<boolean> => {
      const res = await fetch(`${API_BASE}/follows/${venueId}`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to toggle follow");
      const data = await res.json();
      setFollowing((prev) => {
        const next = new Set(prev);
        if (data.following) {
          next.add(venueId);
        } else {
          next.delete(venueId);
        }
        return next;
      });
      return data.following as boolean;
    },
    []
  );

  return { isFollowing, toggleFollow, loading };
}
