import { useEffect, useState } from "react";

let adminRequest: Promise<boolean> | null = null;

/** Whether the signed-in user can use admin tools (server-checked). */
export function useIsAdmin(isAuthenticated: boolean) {
  // null = not checked yet for the signed-in user
  const [result, setResult] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setResult(null);
      return;
    }
    let cancelled = false;
    adminRequest ??= fetch("/api/admin/me", { credentials: "include" })
      .then((res) => res.ok)
      .catch(() => false);
    adminRequest.then((ok) => {
      if (!cancelled) setResult(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  return {
    isAdmin: isAuthenticated && result === true,
    loading: isAuthenticated && result === null,
  };
}
