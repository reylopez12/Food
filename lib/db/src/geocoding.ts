export interface LocationInput {
  id: string;
  name: string;
  address: string;
  city: string;
}

export interface CensusMatch {
  matchedAddress: string;
  coordinates: { x: number; y: number };
  addressComponents: { city: string; state: string };
  tigerLine: { tigerLineId: string; side: string };
}

export interface LocationEvidence extends LocationInput {
  status: "accepted" | "review";
  reason: string;
  provider: "US Census Geocoder";
  precision: "street-address-range";
  checkedAt: string;
  benchmark: string;
  matches: CensusMatch[];
  lat?: number;
  lng?: number;
}

/** Normalize only equivalent street forms, never remove street numbers or direction. */
export function normalizeStreet(value: string): string {
  const aliases: Record<string, string> = {
    street: "st", avenue: "ave", boulevard: "blvd", road: "rd", drive: "dr",
    lane: "ln", court: "ct", place: "pl", terrace: "ter", highway: "hwy", parkway: "pkwy",
    north: "n", south: "s", east: "e", west: "w",
    first: "1st", second: "2nd", third: "3rd", fourth: "4th", fifth: "5th",
    sixth: "6th", seventh: "7th", eighth: "8th", ninth: "9th", tenth: "10th",
  };
  return value.toLowerCase().replace(/\b[a-z]+\b/g, word => aliases[word] ?? word)
    .replace(/[^a-z0-9]/g, "");
}

export function addressParts(input: LocationInput): { street: string; city: string; state: string } | null {
  const city = input.city.match(/^([a-z ]+),\s*CA$/i)?.[1]?.trim();
  // Avoid intersections, ranges, notes and malformed addresses. Unit numbers
  // don't move the building, but the original address remains in the evidence.
  const street = input.address.replace(/(?:,?\s+(?:suite|ste|unit|apt)\.?\s+[a-z0-9-]+|,?\s+#\s*[a-z0-9-]+)$/i, "").trim();
  if (!city || !/^\d+\s+[a-z0-9][a-z0-9 .'-]+$/i.test(street)
    || /\b(?:unknown|approx|near|tbd|verify)\b/i.test(street)) return null;
  return { street, city, state: "CA" };
}

export function validateCensusMatches(
  input: LocationInput,
  matches: CensusMatch[],
  checkedAt = new Date().toISOString(),
  benchmark = "Public_AR_Current",
): LocationEvidence {
  const result: LocationEvidence = {
    ...input, status: "review", reason: "", provider: "US Census Geocoder",
    precision: "street-address-range", checkedAt, benchmark, matches,
  };
  const parts = addressParts(input);
  if (!parts) return { ...result, reason: "Incomplete or ambiguous street address; needs confirmation" };
  if (matches.length !== 1) return {
    ...result, reason: matches.length ? "Multiple provider matches; needs review" : "No provider match",
  };
  const match = matches[0];
  const matchedParts = match.matchedAddress?.split(",").map(value => value.trim());
  if (!matchedParts || matchedParts.length < 3
    || normalizeStreet(matchedParts[0]) !== normalizeStreet(parts.street)) {
    return { ...result, reason: "Street number/name/direction differs from supplied address" };
  }
  if (match.addressComponents?.state !== "CA"
    || match.addressComponents.city?.toLowerCase() !== parts.city.toLowerCase()
    || matchedParts[1]?.toLowerCase() !== parts.city.toLowerCase()
    || matchedParts[2] !== "CA") {
    return { ...result, reason: "Provider city/state differs from supplied city/state" };
  }
  const lat = match.coordinates?.y;
  const lng = match.coordinates?.x;
  // The imported directory is explicitly East Bay; no remote matches or
  // null-island coordinates, even if a provider labels them a match.
  if (!Number.isFinite(lat) || !Number.isFinite(lng)
    || lat < 37.6 || lat > 38.05 || lng < -122.5 || lng > -122.05
    || !match.tigerLine?.tigerLineId) {
    return { ...result, reason: "Invalid or out-of-area street-address coordinates" };
  }
  return { ...result, status: "accepted", reason: "Single exact street and city/state match", lat, lng };
}

/** Revalidate stored evidence and bind it to the exact current ID/address/city. */
export function locationPatch(input: LocationInput & { lat: number; lng: number }, evidence: LocationEvidence) {
  if (input.id !== evidence.id || input.address !== evidence.address || input.city !== evidence.city
    || input.lat !== 0 || input.lng !== 0 || evidence.status !== "accepted") return null;
  const validated = validateCensusMatches(input, evidence.matches, evidence.checkedAt, evidence.benchmark);
  if (validated.status !== "accepted" || validated.lat !== evidence.lat || validated.lng !== evidence.lng) return null;
  return { lat: validated.lat!, lng: validated.lng! };
}
