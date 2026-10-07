/**
 * Origin of the API server, without a trailing slash ('' = same origin).
 *
 * - EXPO_PUBLIC_API_URL: a full URL, set by `pnpm dev:local` to your
 *   computer's address (e.g. http://192.168.1.20:5000) when running off Replit.
 * - EXPO_PUBLIC_DOMAIN: the Replit dev domain, injected by the Replit dev script.
 */
export function getApiBase(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit) return explicit.replace(/\/+$/, '');
  if (process.env.EXPO_PUBLIC_DOMAIN) return `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
  return '';
}
