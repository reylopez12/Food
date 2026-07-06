import { useState, useEffect, useCallback } from "react";

const API_BASE = "/api";

export interface NotificationItem {
  id: string;
  readAt: string | null;
  createdAt: string;
  announcement: {
    id: string;
    venueId: string;
    venueName: string;
    title: string;
    body: string;
    type: string;
    createdAt: string;
  };
}

async function fetchNotifications(): Promise<NotificationItem[]> {
  const res = await fetch(`${API_BASE}/notifications`, { credentials: "include" });
  if (!res.ok) return [];
  return res.json();
}

export function useNotifications(isAuthenticated: boolean) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      return;
    }
    setLoading(true);
    fetchNotifications()
      .then(setNotifications)
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  // Initial load
  useEffect(() => {
    reload();
  }, [reload]);

  // Real-time SSE stream — re-fetch whenever the server pushes a "refresh" event
  useEffect(() => {
    if (!isAuthenticated) return;
    let es: EventSource;
    try {
      es = new EventSource(`${API_BASE}/notifications/stream`, { withCredentials: true });
      es.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data) as { type: string };
          if (payload.type === "refresh") reload();
        } catch {
          // malformed — ignore
        }
      };
      // On error, close and let natural refocus/mount handle refresh
      es.onerror = () => { try { es.close(); } catch { /* ignore */ } };
    } catch {
      // EventSource not supported — silent fallback to manual refresh
    }
    return () => { try { es?.close(); } catch { /* ignore */ } };
  }, [isAuthenticated, reload]);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const markRead = useCallback(
    async (ids?: string[]) => {
      try {
        await fetch(`${API_BASE}/notifications/read`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: ids ?? [] }),
        });
        const now = new Date().toISOString();
        setNotifications((prev) =>
          prev.map((n) =>
            !ids || ids.length === 0 || ids.includes(n.id)
              ? { ...n, readAt: now }
              : n,
          ),
        );
      } catch {
        // ignore
      }
    },
    [],
  );

  return { notifications, loading, unreadCount, markRead, reload };
}

export function useBroadcasterStatus(venueId: string) {
  const [active, setActive] = useState(false);
  const [canPost, setCanPost] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!venueId) return;
    setLoading(true);
    fetch(`${API_BASE}/broadcaster/status/${venueId}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { active: false, canPost: false }))
      .then((d) => {
        setActive(Boolean(d.active));
        setCanPost(Boolean(d.canPost));
      })
      .catch(() => { setActive(false); setCanPost(false); })
      .finally(() => setLoading(false));
  }, [venueId]);

  return { active, canPost, loading };
}

export function useAnnouncements(venueId: string) {
  const [announcements, setAnnouncements] = useState<
    Array<{ id: string; title: string; body: string; type: string; createdAt: string }>
  >([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(() => {
    if (!venueId) return;
    setLoading(true);
    fetch(`${API_BASE}/listings/${venueId}/announcements`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setAnnouncements)
      .catch(() => setAnnouncements([]))
      .finally(() => setLoading(false));
  }, [venueId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const post = useCallback(
    async (data: { title: string; body: string; type: string }) => {
      const res = await fetch(`${API_BASE}/listings/${venueId}/announcements`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to post announcement");
      }
      reload();
    },
    [venueId, reload],
  );

  return { announcements, loading, post, reload };
}
