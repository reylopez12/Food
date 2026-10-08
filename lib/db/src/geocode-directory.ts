import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { db, pool, isEmbeddedDatabase } from "./index";
import { venuesTable } from "./schema";
import { findWorkspaceRoot } from "./directory";
import { addressParts, locationPatch, validateCensusMatches, type CensusMatch, type LocationEvidence } from "./geocoding";
import { confirmedPostalCode } from "./confirmed-addresses";

const root = findWorkspaceRoot();
const reportDir = path.join(root, "reports");
const reportPath = path.join(reportDir, "directory-geocoding.json");
const manifestPath = path.join(root, "lib/db/src/data/venue-locations.json");
const endpoint = "https://geocoding.geo.census.gov/geocoder/locations/address";

async function main() {
  // No implicit writes to the DB; production must be selected deliberately.
  const apply = process.argv.includes("--apply");
  const fromEvidence = process.argv.includes("--from-evidence");
  if (isEmbeddedDatabase) throw new Error("Run with the configured PostgreSQL database; do not open the running embedded database from a second process.");
  if (process.env.NODE_ENV === "production" && apply && !process.argv.includes("--allow-production")) {
    throw new Error("Production writes require explicit --allow-production");
  }
  mkdirSync(reportDir, { recursive: true });
  const current = await db.select().from(venuesTable);
  const report: LocationEvidence[] = [];
  if (fromEvidence) {
    report.push(...JSON.parse(readFileSync(manifestPath, "utf8")) as LocationEvidence[]);
  } else {
    const previous: LocationEvidence[] = existsSync(reportPath)
      ? (JSON.parse(readFileSync(reportPath, "utf8")) as { results: LocationEvidence[] }).results : [];
    const cache = new Map(previous.map(item => [`${item.id}|${item.address}|${item.city}`, item]));
    const pending = current.filter(venue => venue.lat === 0 && venue.lng === 0);
    // Four bounded workers, no per-keystroke geocoding or runtime dependency.
    let next = 0;
    await Promise.all(Array.from({ length: 4 }, async () => {
      while (next < pending.length) {
        const venue = pending[next++];
        const baseInput = { id: venue.id, name: venue.name, address: venue.address, city: venue.city };
        const zip = confirmedPostalCode(baseInput);
        const input = zip ? { ...baseInput, zip } : baseInput;
        const cached = cache.get(`${venue.id}|${venue.address}|${venue.city}`);
        if (cached && cached.zip === zip && !process.argv.includes("--refresh") && !cached.reason.startsWith("Provider unavailable")) {
          report.push(validateCensusMatches(input, cached.matches, cached.checkedAt, cached.benchmark));
          continue;
        }
        const parts = addressParts(input);
        if (!parts) {
          report.push(validateCensusMatches(input, []));
          continue;
        }
        const url = new URL(endpoint);
        Object.entries({ ...parts, ...(zip ? { zip } : {}), benchmark: "Public_AR_Current", format: "json" })
          .forEach(([key, value]) => url.searchParams.set(key, value));
        let result: LocationEvidence | undefined;
        for (let attempt = 0; attempt < 2 && !result; attempt++) {
          try {
            const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const body = await response.json() as { result?: { addressMatches?: CensusMatch[]; input?: { benchmark?: { benchmarkName?: string } } } };
            if (!Array.isArray(body.result?.addressMatches)) throw new Error("Malformed provider response");
            result = validateCensusMatches(input, body.result.addressMatches, new Date().toISOString(),
              body.result.input?.benchmark?.benchmarkName ?? "Public_AR_Current");
          } catch (error) {
            if (attempt === 1) result = {
              ...validateCensusMatches(input, []),
              reason: `Provider unavailable: ${error instanceof Error ? error.message : String(error)}`,
            };
            else await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        report.push(result!);
        // Persist progress so an interrupted run resumes without repeated calls.
        writeFileSync(reportPath, JSON.stringify({ results: [...previous.filter(item => !report.some(done => done.id === item.id)), ...report] }, null, 2));
      }
    }));
  }
  report.sort((a, b) => a.id.localeCompare(b.id));
  const accepted = report.filter(item => item.status === "accepted");
  let updated = 0;
  if (apply) {
    if (accepted.some(item => {
      const venue = current.find(candidate => candidate.id === item.id);
      return venue && locationPatch(venue, item);
    })) writeFileSync(path.join(reportDir, "directory-before-geocoding.json"), JSON.stringify(current, null, 2));
    await db.transaction(async tx => {
      for (const item of accepted) {
        const venue = current.find(candidate => candidate.id === item.id);
        if (!venue) continue;
        const patch = locationPatch(venue, item);
        if (!patch) continue;
        const changes = await tx.update(venuesTable).set(patch).where(and(
          eq(venuesTable.id, item.id), eq(venuesTable.address, item.address),
          eq(venuesTable.city, item.city), eq(venuesTable.lat, 0), eq(venuesTable.lng, 0),
        )).returning({ id: venuesTable.id });
        updated += changes.length;
      }
    });
  }
  // Merge, don't lose evidence for listings already geocoded on an earlier run.
  const stored = JSON.parse(readFileSync(manifestPath, "utf8")) as LocationEvidence[];
  const locations = new Map(stored.map(item => [item.id, item]));
  for (const item of report) {
    locations.delete(item.id);
    if (item.status === "accepted") locations.set(item.id, item);
  }
  if (!fromEvidence) writeFileSync(manifestPath, JSON.stringify([...locations.values()].sort((a, b) => a.id.localeCompare(b.id)), null, 2) + "\n");
  const summary = { mode: apply ? "applied" : "preview", provider: "US Census Geocoder",
    precision: "street-address-range", total: current.length, checked: report.length,
    accepted: accepted.length, review: report.length - accepted.length, updated };
  if (!fromEvidence) writeFileSync(reportPath, JSON.stringify({ summary, results: report }, null, 2) + "\n");
  const quote = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const rows = [
    ["Status", "Listing ID", "Restaurant", "Supplied address", "City", "Reason", "Provider matched address", "Latitude", "Longitude", "Precision", "Checked at"],
    ...report.map(item => [item.status, item.id, item.name, item.address, item.city, item.reason,
      item.matches.map(match => match.matchedAddress).join("; "), item.lat ?? "", item.lng ?? "", item.precision, item.checkedAt]),
  ];
  // Applying only accepted evidence must not erase the unresolved review rows.
  if (!fromEvidence) writeFileSync(path.join(reportDir, "directory-geocoding.csv"), rows.map(row => row.map(quote).join(",")).join("\n") + "\n");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => pool?.end());
