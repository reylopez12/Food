import { createHash } from "node:crypto";
import path from "node:path";
import { asVenue, findWorkspaceRoot, parseCsv, type DirectorySource } from "./directory";
import { loadSeedDirectoryVenues } from "./directory-updates";
import type { InsertVenue, Venue } from "./schema";

/** Deliberately excludes trust, reviews, payment flags and video fields. */
export const DIRECTORY_FIELDS = [
  "name", "category", "address", "city", "neighborhood", "phone", "website",
  "hours", "description", "tags", "priceRange", "initials", "lat", "lng",
] as const;
type Editable = typeof DIRECTORY_FIELDS[number];
export type ImportFile = { name: string; content: string; city?: string };
export type ImportInput = { source: "prepared" | "csv"; files?: ImportFile[]; previewToken?: string };
export type Candidate = {
  source: string; row: number; name: string; error?: string;
  venue?: InsertVenue; fields: Editable[]; explicitId?: boolean;
};
export type PreviewRow = {
  source: string; row: number; name: string;
  action: "add" | "update" | "unchanged" | "blocked"; reason: string;
  changes: { field: string; before: string; after: string }[];
};
export type ImportPlan = {
  rows: PreviewRow[];
  summary: { added: number; updated: number; unchanged: number; blocked: number };
  additions: InsertVenue[];
  updates: { id: string; values: Partial<Pick<InsertVenue, Editable>> }[];
};

export function normalized(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
}
function cityKey(city: string) {
  return normalized(city.replace(/,\s*CA(?:\s*\d{5})?$/i, ""));
}
function identity(venue: Pick<InsertVenue, "name" | "city">) {
  return `${normalized(venue.name)}|${cityKey(venue.city)}`;
}
function addressKey(venue: Pick<InsertVenue, "address" | "city">) {
  const street = normalized(venue.address)
    .replace(/\bstreet\b/g, "st").replace(/\bavenue\b/g, "ave")
    .replace(/\broad\b/g, "rd").replace(/\bboulevard\b/g, "blvd")
    .replace(/\bdrive\b/g, "dr").replace(/\bsuite\b/g, "ste");
  return `${street}|${cityKey(venue.city)}`;
}
function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => [key, stable(item)]));
  }
  return value;
}
export function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}
export function directoryDigest(venues: Venue[]): string {
  return digest([...venues].sort((a, b) => a.id.localeCompare(b.id)));
}
function display(value: unknown): string {
  return value == null ? "" : typeof value === "string" ? value : JSON.stringify(value);
}
function assertHttpUrl(value: string) {
  if (!value) return;
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Website must use http or https");
}

function csvCandidate(row: Record<string, string>, file: ImportFile, index: number): Candidate {
  const source = file.name;
  const get = (...keys: string[]) => {
    for (const key of keys) {
      const found = Object.entries(row).find(([header]) => normalized(header) === normalized(key));
      if (found) return found[1];
    }
    return "";
  };
  const name = get("Restaurant", "Restaurant Name", "Name");
  const candidate: Candidate = { source, row: index + 2, name: name || "(missing name)", fields: [] };
  try {
    const address = get("Address", "Street Address");
    const inferred = address.match(/,\s*(Albany|Alameda|Berkeley|Oakland),\s*CA(?:\s*\d{5})?/i)?.[1];
    const filenameCity = file.name.match(/^(Albany|Alameda|Berkeley|Oakland)/i)?.[1];
    const city = (get("City") || inferred || file.city || filenameCity || "")
      .replace(/,\s*CA(?:\s*\d{5})?$/i, "").trim();
    if (!/^(Albany|Alameda|Berkeley|Oakland)$/i.test(city)) {
      throw new Error("City must be Albany, Alameda, Berkeley or Oakland; select a fallback city");
    }
    if (inferred && normalized(inferred) !== normalized(city)) throw new Error("City and address disagree");
    if (!name || !address) throw new Error("Restaurant name and address are required");
    if (!/\d/.test(address) || /\b(tbd|unknown|verify|pending|confirm)\b/i.test(address)) {
      throw new Error("A confirmed street address is required; research placeholders cannot be imported");
    }
    if (Object.values(row).some((value) => value.length > 12000)) throw new Error("A CSV field is too long");
    const category = get("Category");
    if (category && !/^(restaurant|restaurants)$/i.test(category)) {
      throw new Error("This tool imports restaurants only");
    }
    const canonicalCity = city[0].toUpperCase() + city.slice(1).toLowerCase();
    const mapped = {
      Restaurant: name, Address: address, Cuisine: get("Cuisine"),
      Neighborhood: get("Neighborhood"), Phone: get("Phone"),
      Website: get("Website"), Hours: get("Hours"),
      Description: get("Directory Description", "Listing Description", "Description", "Summary"),
      Highlights: get("Highlights"), "Price Level": get("Price Level", "Price Range"),
    };
    // Albany is parsed by the existing Berkeley-area importer from its full address.
    const sourceCity: DirectorySource = canonicalCity === "Albany" ? "Berkeley" : canonicalCity as DirectorySource;
    const fullAddress = /,\s*(Albany|Alameda|Berkeley|Oakland),\s*CA/i.test(address)
      ? address : `${address}, ${canonicalCity}, CA`;
    const venue = asVenue({ ...mapped, Address: fullAddress }, sourceCity, true);
    venue.city = `${canonicalCity}, CA`;
    const explicitId = get("Listing ID", "ID");
    if (explicitId) {
      if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,179}$/.test(explicitId)) throw new Error("Invalid listing ID");
      venue.id = explicitId;
      candidate.explicitId = true;
    }
    venue.rating = 0;
    venue.reviewCount = 0;
    venue.featured = false;
    venue.verified = false;
    venue.broadcasterActive = false;
    assertHttpUrl(venue.website);
    candidate.fields = ["name", "category", "address", "city", "initials"];
    for (const key of ["neighborhood", "phone", "website", "hours", "description", "priceRange"] as const) {
      if (venue[key]) candidate.fields.push(key);
    }
    if (venue.tags.length) candidate.fields.push("tags");
    const latText = get("Latitude", "Lat"), lngText = get("Longitude", "Lng", "Lon");
    if (latText || lngText) {
      if (!latText || !lngText) throw new Error("Supply both latitude and longitude, or leave both blank");
      const lat = Number(latText), lng = Number(lngText);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180
        || ((lat === 0) !== (lng === 0))) throw new Error("Invalid coordinates");
      venue.lat = lat;
      venue.lng = lng;
      candidate.fields.push("lat", "lng");
    }
    candidate.venue = venue;
  } catch (error) {
    candidate.error = error instanceof Error ? error.message : "Invalid CSV row";
  }
  return candidate;
}

export function parseImportInput(input: unknown): ImportInput {
  if (!input || typeof input !== "object") throw new Error("Import input is required");
  const body = input as Record<string, unknown>;
  if (body.source !== "prepared" && body.source !== "csv") throw new Error("Choose prepared directory or CSV files");
  if (body.previewToken !== undefined && (typeof body.previewToken !== "string" || body.previewToken.length > 4096)) {
    throw new Error("Invalid preview token");
  }
  const result: ImportInput = { source: body.source, previewToken: body.previewToken as string | undefined };
  if (body.source === "csv") {
    if (!Array.isArray(body.files) || !body.files.length || body.files.length > 6) throw new Error("Upload 1–6 CSV files");
    let bytes = 0;
    result.files = body.files.map((item) => {
      if (!item || typeof item !== "object") throw new Error("Invalid file");
      const file = item as Record<string, unknown>;
      if (typeof file.name !== "string" || !/\.csv$/i.test(file.name) || file.name.length > 200
        || typeof file.content !== "string" || !file.content.trim()
        || (file.city !== undefined && (typeof file.city !== "string" || file.city.length > 30))) {
        throw new Error("Each upload must be a nonempty CSV with a valid file name");
      }
      bytes += Buffer.byteLength(file.content, "utf8");
      if (bytes > 1024 * 1024) throw new Error("CSV uploads must total no more than 1 MB");
      return { name: file.name, content: file.content, city: file.city as string | undefined };
    });
  }
  return result;
}

export function loadImportCandidates(input: ImportInput): Candidate[] {
  if (input.source === "prepared") {
    return loadSeedDirectoryVenues(path.join(findWorkspaceRoot(), "attached_assets")).map((venue, i) => ({
      source: "Prepared directory", row: i + 1, name: venue.name, venue,
      fields: [...DIRECTORY_FIELDS], explicitId: true,
    }));
  }
  const candidates: Candidate[] = [];
  for (const file of input.files!) {
    try {
      const rows = parseCsv(file.content.replace(/^\uFEFF/, ""));
      if (!rows.length) throw new Error("CSV contains no restaurant rows");
      candidates.push(...rows.map((row, i) => csvCandidate(row, file, i)));
    } catch (error) {
      candidates.push({ source: file.name, row: 1, name: "(file)", fields: [],
        error: error instanceof Error ? error.message : "Invalid CSV" });
    }
    if (candidates.length > 1000) throw new Error("Import at most 1,000 rows at a time");
  }
  return candidates;
}

export function buildImportPlan(candidates: Candidate[], existing: Venue[]): ImportPlan {
  const plan: ImportPlan = {
    rows: [], summary: { added: 0, updated: 0, unchanged: 0, blocked: 0 }, additions: [], updates: [],
  };
  const batch = candidates.filter((candidate) => candidate.venue && !candidate.error);
  const matches = new Map<Candidate, Venue | undefined>();
  const reasons = new Map<Candidate, string>();
  for (const candidate of batch) {
    const venue = candidate.venue!;
    const idMatch = existing.find((item) => item.id === venue.id);
    const nameMatches = existing.filter((item) => identity(item) === identity(venue));
    const addressMatches = existing.filter((item) => addressKey(item) === addressKey(venue));
    if (idMatch && identity(idMatch) !== identity(venue)) {
      reasons.set(candidate, "Listing ID belongs to a different restaurant; review before importing");
      continue;
    }
    if (nameMatches.length > 1 && !idMatch) {
      reasons.set(candidate, "Multiple existing restaurants match this name and city; specify the correct listing ID");
      continue;
    }
    const match = idMatch || nameMatches[0];
    if (match && match.category !== "restaurants") {
      reasons.set(candidate, "Existing listing is not a restaurant; this import cannot change it");
      continue;
    }
    if (addressMatches.some((item) => item.id !== match?.id)) {
      reasons.set(candidate, "Possible duplicate: another listing has this street address and city");
      continue;
    }
    matches.set(candidate, match);
  }
  // Flag BOTH rows, not only the second occurrence.
  for (const candidate of batch) {
    const venue = candidate.venue!;
    const duplicate = batch.find((other) => other !== candidate && (
      other.venue!.id === venue.id || identity(other.venue!) === identity(venue)
      || addressKey(other.venue!) === addressKey(venue)
      || (matches.get(candidate) && matches.get(other)?.id === matches.get(candidate)?.id)
    ));
    if (duplicate) reasons.set(candidate,
      `Duplicate or ambiguous input also appears in ${duplicate.source}, row ${duplicate.row}; remove or resolve it before saving`);
  }
  for (const candidate of candidates) {
    const reason = candidate.error || reasons.get(candidate);
    const row: PreviewRow = {
      source: candidate.source, row: candidate.row, name: candidate.name,
      action: "unchanged", reason: "", changes: [],
    };
    if (reason || !candidate.venue) {
      row.action = "blocked";
      row.reason = reason || "Invalid restaurant";
      plan.summary.blocked++;
    } else {
      const venue = { ...candidate.venue }, match = matches.get(candidate);
      if (!match) {
        row.action = "add";
        row.changes = candidate.fields.map((field) => ({ field, before: "", after: display(venue[field]) }));
        // Never trust protected values, including for new restaurants.
        plan.additions.push({ ...venue, rating: 0, reviewCount: 0, verified: false,
          featured: false, broadcasterActive: false, hasVideo: false, video: null });
        plan.summary.added++;
      } else {
        const fields = [...candidate.fields];
        const values: Record<string, unknown> = {};
        // A coordinate is bound to its street address, never reused after a move.
        if (addressKey(match) !== addressKey(venue) && !fields.includes("lat")) {
          fields.push("lat", "lng");
          venue.lat = 0;
          venue.lng = 0;
        }
        for (const field of fields) {
          if (field === "lat" || field === "lng") {
            // Unknown imported coordinates must not erase known locations at the same address.
            if (venue.lat === 0 && venue.lng === 0 && addressKey(match) === addressKey(venue)) continue;
          }
          if (digest(match[field]) !== digest(venue[field])) {
            values[field] = venue[field];
            row.changes.push({ field, before: display(match[field]), after: display(venue[field]) });
          }
        }
        if (row.changes.length) {
          row.action = "update";
          plan.updates.push({ id: match.id, values });
          plan.summary.updated++;
        } else {
          plan.summary.unchanged++;
        }
      }
    }
    plan.rows.push(row);
  }
  return plan;
}
