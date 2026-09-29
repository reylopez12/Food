import { useCallback, useEffect, useState } from 'react';
import type { AuthUser } from '@workspace/api-client-react';

export type { AuthUser };

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

function getBasePath() {
  return import.meta.env.BASE_URL.replace(/\/+$/, '') || '/';
}

/** Where to land after login: the page the user is on now. */
function getReturnTo() {
  const { pathname, search } = window.location;
  return pathname.startsWith('/') ? `${pathname}${search}` : getBasePath();
}

// Every component that calls useAuth shares one request per page load.
let userRequest: Promise<AuthUser | null> | null = null;

function fetchUser(): Promise<AuthUser | null> {
  userRequest ??= fetch('/api/auth/user', { credentials: 'include' })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{ user: AuthUser | null }>;
    })
    .then((data) => data.user ?? null)
    .catch(() => {
      userRequest = null;
      return null;
    });
  return userRequest;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetchUser().then((result) => {
      if (!cancelled) {
        setUser(result);
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(() => {
    window.location.href = `/api/login?returnTo=${encodeURIComponent(getReturnTo())}`;
  }, []);

  const logout = useCallback(() => {
    const base = getBasePath();
    window.location.href = `/api/logout?returnTo=${encodeURIComponent(base)}`;
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
  };
}
