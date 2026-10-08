// Helpers shared by the public, unauthenticated submission forms.

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Trimmed, length-capped string; anything non-string becomes "". */
export function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/**
 * Simple in-memory per-IP limiter. Returns a function that records a hit and
 * reports whether the caller has exceeded `max` hits within `windowMs`.
 */
export function createRateLimiter(max: number, windowMs: number) {
  const recent = new Map<string, number[]>();
  return function rateLimited(ip: string): boolean {
    const now = Date.now();
    if (recent.size > 10_000) recent.clear();
    const hits = (recent.get(ip) ?? []).filter((t) => now - t < windowMs);
    hits.push(now);
    recent.set(ip, hits);
    return hits.length > max;
  };
}
