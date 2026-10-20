import evidence from "./data/venue-locations.json";
import { locationPatch, type LocationEvidence } from "./geocoding";
import type { InsertVenue } from "./schema";

export const verifiedLocationEvidence = evidence as LocationEvidence[];

export function withVerifiedLocations(venues: InsertVenue[]): InsertVenue[] {
  const locations = new Map(verifiedLocationEvidence.map(item => [item.id, item]));
  return venues.map(venue => {
    const item = locations.get(venue.id);
    if (!item) return venue;
    const patch = locationPatch(venue, item);
    return patch ? { ...venue, ...patch } : venue;
  });
}
