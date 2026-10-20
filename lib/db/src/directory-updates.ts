import path from "node:path";
import { asVenue, loadDirectoryVenues, readDirectoryCsv, PREVIOUS_DIRECTORY_FILES, UPDATED_DIRECTORY_FILES, type DirectorySource } from "./directory";
import type { InsertVenue } from "./schema";
import { withVerifiedLocations } from "./verified-locations";
import { withConfirmedAddresses } from "./confirmed-addresses";

export interface DirectoryUpdate {
  venue: InsertVenue;
  fields: (keyof InsertVenue)[];
  source: string;
  row: number;
  notes: string;
}

export interface DirectoryFlag {
  source: string;
  row: number;
  name: string;
  reason: string;
}

type DirectoryFiles = readonly (readonly [DirectorySource, string])[];

export function loadDirectoryUpdateBatch(assetsDir: string, files: DirectoryFiles = UPDATED_DIRECTORY_FILES) {
  const updates: DirectoryUpdate[] = [];
  const flags: DirectoryFlag[] = [];
  let inputRows = 0;
  let ignoredRows = 0;
  for (const [city, filename] of files) {
    let supplementaryTable = false;
    for (const [index, original] of readDirectoryCsv(path.join(assetsDir, filename)).entries()) {
      const name = original.Restaurant || original.Name || "";
      // Alameda contains a second table with a different header in the same CSV.
      if (!Object.values(original).some((value) => value.trim())
        || name === "RESTAURANTS WITHOUT ENOUGH INFORMATION FOR A DESCRIPTION") {
        ignoredRows++;
        continue;
      }
      if (name === "Restaurant" && original.Neighborhood === "Address" && original.Cuisine === "Phone") {
        supplementaryTable = true;
        ignoredRows++;
        continue;
      }
      inputRows++;
      const notes = supplementaryTable
        ? `What was found: ${original.Address}. Verification next step: ${original.Phone}. Sources checked: ${original.Website}`
        : [original["Verify Before Publishing"], original["Notes to Verify"], original["What to verify"], original.Notes]
          .filter(Boolean).join("; ");
      const row = supplementaryTable
        ? {
            Restaurant: name,
            Address: `${original.Neighborhood}, Alameda, CA`,
            // "Not found" is not a phone number; placeholder text is not a description.
            Phone: original.Cuisine.replace(/\D/g, "").length === 10 ? original.Cuisine : "",
          }
        : original;
      if (!name || !/^\d/.test(row.Address)) {
        flags.push({ source: filename, row: index + 2, name,
          reason: `Missing or ambiguous street address; not imported. ${notes}` });
        continue;
      }
      const fields: (keyof InsertVenue)[] = ["name", "address", "city"];
      if (row["Directory Description"] || row["Listing Description"] || row.Description || row.Summary) {
        fields.push("description");
      }
      for (const [column, field] of [
        ["Neighborhood", "neighborhood"], ["Phone", "phone"], ["Website", "website"],
        ["Hours", "hours"], ["Price Level", "priceRange"], ["Rating", "rating"],
      ] as const) {
        // A missing or empty field is not an instruction to erase owner data.
        if (row[column]?.trim()) fields.push(field);
      }
      if (row.Cuisine || row.Highlights) fields.push("tags");
      updates.push({
        venue: asVenue(row, city, true), fields, source: filename, row: index + 2, notes,
      });
    }
  }
  return { updates, flags, inputRows, ignoredRows };
}

export function loadDirectoryUpdates(assetsDir: string, files: DirectoryFiles = UPDATED_DIRECTORY_FILES): DirectoryUpdate[] {
  return loadDirectoryUpdateBatch(assetsDir, files).updates;
}

/** Apply upload generations separately so older supplied fields survive partial updates. */
export function loadSeedDirectoryVenues(assetsDir: string): InsertVenue[] {
  let venues = loadDirectoryVenues(assetsDir);
  for (const files of [PREVIOUS_DIRECTORY_FILES, UPDATED_DIRECTORY_FILES]) {
    venues = planDirectoryUpdates(venues, loadDirectoryUpdates(assetsDir, files)).venues;
  }
  return withVerifiedLocations(withConfirmedAddresses(venues));
}

export function normalizeIdentity(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");
}

function cityKey(venue: InsertVenue): string {
  return normalizeIdentity(venue.city.split(",")[0]);
}

function addressKey(value: string): string {
  return normalizeIdentity(value.replace(/,\s*[^,]+,\s*CA(?:\s*\d{5})?$/i, "")
    .replace(/\b(street|avenue|boulevard|road|drive|lane)\b/gi,
      (word) => ({ street: "st", avenue: "ave", boulevard: "blvd", road: "rd", drive: "dr", lane: "ln" })[word.toLowerCase()]!));
}

/** Unit/context differences do not imply a new business when the phone also matches. */
function streetKey(value: string): string {
  return addressKey(value.replace(/\([^)]*\)/g, "")
    .replace(/(?:,?\s*(?:suite|ste|apt|unit)\s*\S+|\s*#\s*\S+)/gi, "")
    .replace(/\b(north|south|east|west)\b/gi,
      (word) => ({ north: "n", south: "s", east: "e", west: "w" })[word.toLowerCase()]!));
}

function identityMatch(a: InsertVenue, b: InsertVenue): boolean {
  if (a.id === b.id) return true;
  if (cityKey(a) !== cityKey(b)) return false;
  if (normalizeIdentity(a.name) === normalizeIdentity(b.name)) return true;
  // Address alone is unsafe: food halls can house different businesses.
  const phoneA = a.phone.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  const phoneB = b.phone.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  return streetKey(a.address) === streetKey(b.address) && phoneA.length === 10 && phoneA === phoneB;
}

export function planDirectoryUpdates(existing: InsertVenue[], incoming: DirectoryUpdate[]) {
  const working = existing.map((venue) => ({ ...venue }));
  const actions: { kind: "new" | "updated" | "unchanged"; id: string; fields: string[]; source: string; row: number; name: string }[] = [];
  const flags: DirectoryFlag[] = [];
  const seen = new Set<string>();
  for (const entry of incoming) {
    const { venue, source, row } = entry;
    const matches = working.filter((candidate) => identityMatch(candidate, venue));
    if (matches.length > 1) {
      flags.push({ source, row, name: venue.name, reason: `Ambiguous match: ${matches.map((match) => match.id).join(", ")}` });
      continue;
    }
    const match = matches[0];
    if (!match) {
      // Flag possible duplicate names at a shared address instead of guessing.
      const suspects = working.filter((candidate) => cityKey(candidate) === cityKey(venue)
        && addressKey(candidate.address) === addressKey(venue.address));
      if (suspects.length) {
        flags.push({ source, row, name: venue.name, reason: `Shared address needs review: ${suspects.map((item) => item.name).join(", ")}` });
        continue;
      }
      working.push({ ...venue });
      seen.add(venue.id);
      actions.push({ kind: "new", id: venue.id, fields: entry.fields, source, row, name: venue.name });
      continue;
    }
    if (seen.has(match.id)) {
      flags.push({ source, row, name: venue.name, reason: `Duplicate input row for ${match.id}; skipped` });
      continue;
    }
    seen.add(match.id);
    if (!/[?\uFFFD]/.test(venue.name) && normalizeIdentity(match.name) !== normalizeIdentity(venue.name)) {
      flags.push({ source, row, name: venue.name,
        reason: `Existing listing "${match.name}" (${match.id}) matched by street address and phone; updated instead of creating a duplicate.` });
    }
    const fields: string[] = [];
    for (const field of entry.fields) {
      let value = venue[field];
      if (field === "name" && /[?\uFFFD]/.test(venue.name) && !/[?\uFFFD]/.test(match.name)) {
        flags.push({ source, row, name: match.name, reason: "Damaged characters in incoming name; kept existing spelling" });
        continue;
      }
      // A summary without a status column must not reopen a closed restaurant.
      if (field === "description" && match.description.startsWith("Temporarily closed.")
        && !venue.description.startsWith("Temporarily closed.")) {
        value = `Temporarily closed. ${venue.description}`;
      }
      if (JSON.stringify(match[field]) !== JSON.stringify(value)) {
        Object.assign(match, { [field]: value });
        fields.push(field);
      }
    }
    // A confirmed location belongs to its address, not just the restaurant ID.
    // Re-geocode after a move; never keep a previous-address pin.
    if (fields.includes("address") || fields.includes("city")) {
      if (match.lat !== 0) { match.lat = 0; fields.push("lat"); }
      if (match.lng !== 0) { match.lng = 0; fields.push("lng"); }
    }
    actions.push({ kind: fields.length ? "updated" : "unchanged", id: match.id, fields, source, row, name: match.name });
  }
  return { venues: working, actions, flags };
}
