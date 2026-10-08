import path from "node:path";
import { asVenue, readDirectoryCsv, UPDATED_DIRECTORY_FILES } from "./directory";
import type { InsertVenue } from "./schema";

export interface DirectoryUpdate {
  venue: InsertVenue;
  fields: (keyof InsertVenue)[];
  source: string;
  row: number;
  notes: string;
}

export function loadDirectoryUpdates(assetsDir: string): DirectoryUpdate[] {
  return UPDATED_DIRECTORY_FILES.flatMap(([city, filename]) =>
    readDirectoryCsv(path.join(assetsDir, filename)).map((row, index) => {
      const fields: (keyof InsertVenue)[] = ["name", "address", "city", "description"];
      for (const [column, field] of [
        ["Neighborhood", "neighborhood"], ["Phone", "phone"], ["Website", "website"],
        ["Hours", "hours"], ["Price Level", "priceRange"], ["Rating", "rating"],
      ] as const) {
        // A missing or empty field is not an instruction to erase owner data.
        if (row[column]?.trim()) fields.push(field);
      }
      if (row.Cuisine || row.Highlights) fields.push("tags");
      return {
        venue: asVenue(row, city), fields, source: filename, row: index + 2,
        notes: row["Verify Before Publishing"] || row["Notes to Verify"] || "",
      };
    }),
  );
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

function identityMatch(a: InsertVenue, b: InsertVenue): boolean {
  if (a.id === b.id) return true;
  if (cityKey(a) !== cityKey(b)) return false;
  if (normalizeIdentity(a.name) === normalizeIdentity(b.name)) return true;
  // Address alone is unsafe: food halls can house different businesses.
  const phoneA = a.phone.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  const phoneB = b.phone.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  return addressKey(a.address) === addressKey(b.address) && phoneA.length === 10 && phoneA === phoneB;
}

export function planDirectoryUpdates(existing: InsertVenue[], incoming: DirectoryUpdate[]) {
  const working = existing.map((venue) => ({ ...venue }));
  const actions: { kind: "new" | "updated" | "unchanged"; id: string; fields: string[]; source: string; row: number; name: string }[] = [];
  const flags: { source: string; row: number; name: string; reason: string }[] = [];
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
    actions.push({ kind: fields.length ? "updated" : "unchanged", id: match.id, fields, source, row, name: match.name });
  }
  return { venues: working, actions, flags };
}
