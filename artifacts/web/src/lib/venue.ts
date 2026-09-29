import type { Venue } from "@workspace/api-client-react";
import { hasValidCoordinates } from "../hooks/useNearMe";

/** Google Maps link — pinned coordinates when known, otherwise the street address. */
export function mapsUrl(venue: Pick<Venue, "lat" | "lng" | "name" | "address" | "city">): string {
  const query = hasValidCoordinates(venue.lat, venue.lng)
    ? `${venue.lat},${venue.lng}`
    : `${venue.name}, ${venue.address}, ${venue.city}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** Google Maps turn-by-turn directions to the venue. */
export function directionsUrl(venue: Pick<Venue, "lat" | "lng" | "name" | "address" | "city">): string {
  const destination = hasValidCoordinates(venue.lat, venue.lng)
    ? `${venue.lat},${venue.lng}`
    : `${venue.name}, ${venue.address}, ${venue.city}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

/**
 * Split a free-text hours string ("Mon-Fri 11am-9pm; Sat 10am-2pm (per site)")
 * into display lines, dropping trailing source notes in parentheses.
 */
export function formatHours(hours: string): string[] {
  return hours
    .split(/;|\n/)
    .map((line) => line.replace(/\((?:per|via|according to|source)[^)]*\)/gi, "").trim())
    .filter(Boolean);
}

/** Path inside the app, respecting the deployment base path (e.g. /web/). */
export function appPath(path: string): string {
  return `${import.meta.env.BASE_URL.replace(/\/$/, "")}${path}`;
}
