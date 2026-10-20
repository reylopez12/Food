import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { locationPatch, type LocationEvidence } from "../lib/db/src/geocoding";
import { withConfirmedAddresses } from "../lib/db/src/confirmed-addresses";

// Generates a handoff only. Never connects to or writes a database.
const sourcePath = process.argv[2];
if (!sourcePath) throw new Error("Provide the original directory import file path.");
const original = readFileSync(sourcePath, "utf8");
const delimiter = "$directory_data$";
const parts = original.split(delimiter);
if (parts.length !== 3) throw new Error("Expected exactly one dollar-quoted directory payload.");
const before = JSON.parse(parts[1]) as Array<{
  id: string; name: string; address: string; city: string; lat: number; lng: number;
  name_key: string; address_key: string; city_key: string;
}>;
const rows = withConfirmedAddresses(before.map(row => ({ ...row })));
const identityKey = (value: string) => value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");
const addressKey = (value: string) => identityKey(value
  .replace(/,\s*[^,]+,\s*CA(?:\s*\d{5})?$/i, "")
  .replace(/\b(street|avenue|boulevard|road|drive|lane)\b/gi,
    word => ({ street: "st", avenue: "ave", boulevard: "blvd", road: "rd", drive: "dr", lane: "ln" })[word.toLowerCase()]!));
const correctedIds = new Set<string>();
for (let index = 0; index < rows.length; index++) {
  const row = rows[index];
  if (row.address === before[index].address) continue;
  // Do not mutate the snapshot or recompute unrelated identity fields.
  rows[index] = { ...row, name_key: identityKey(row.name),
    address_key: addressKey(row.address), city_key: identityKey(row.city.split(",")[0]) };
  correctedIds.add(row.id);
}
const evidence = JSON.parse(readFileSync(resolve("lib/db/src/data/venue-locations.json"), "utf8")) as LocationEvidence[];
const byId = new Map(evidence.map(item => [item.id, item]));
if (byId.size !== evidence.length || new Set(rows.map(row => row.id)).size !== rows.length) {
  throw new Error("Duplicate listing IDs or evidence IDs require review.");
}
const used = new Set<string>();
let updated = 0;
for (const row of rows) {
  const match = byId.get(row.id);
  if (!match) continue;
  if (row.name !== match.name) throw new Error(`Restaurant name mismatch: ${row.id}`);
  // An already-generated payload is permitted only when its existing coordinates
  // agree exactly with freshly revalidated evidence. Never accept arbitrary pins.
  const patch = locationPatch({ ...row, lat: 0, lng: 0 }, match);
  if (!patch) throw new Error(`Location evidence did not pass revalidation: ${row.id}`);
  if ((row.lat !== 0 || row.lng !== 0) && (row.lat !== patch.lat || row.lng !== patch.lng)) {
    throw new Error(`Existing source coordinates differ from evidence: ${row.id}`);
  }
  Object.assign(row, patch);
  used.add(row.id);
  updated++;
}
if (used.size !== evidence.length) throw new Error("Some location evidence is not represented in the import.");
const payload = JSON.stringify(rows);
if (payload.includes(delimiter)) throw new Error("Unsafe SQL dollar-quote delimiter in the data.");
const sql = [
  "-- Coordinate evidence: US Census Geocoder; exact supplied street/city match.",
  "-- Coordinates are street-address-range estimates, not business verification or rooftop precision.",
  `-- ${rows.length} listings; ${updated} validated coordinates; ${rows.length - updated} unresolved locations left at (0,0).`,
  parts[0].replace(/^-- Coordinate evidence:[^\n]*\n-- Coordinates are[^\n]*\n-- \d+ listings;[^\n]*\n/, "")
    + delimiter + payload + delimiter + parts[2],
].join("\n");

// Only source-guarded address corrections and their identity keys may change
// besides coordinates; preserve every other field and all SQL safeguards.
rows.forEach((row, index) => {
  const { lat, lng, ...other } = { ...row };
  const { lat: oldLat, lng: oldLng, ...oldOther } = { ...before[index] };
  if (correctedIds.has(row.id)) {
    for (const key of ["address", "name_key", "address_key", "city_key"] as const) {
      other[key] = oldOther[key];
    }
  }
  if (JSON.stringify(other) !== JSON.stringify(oldOther)) throw new Error(`Unexpected non-location change: ${row.id}`);
  if (!used.has(row.id) && (lat !== oldLat || lng !== oldLng)) throw new Error(`Unresolved location changed: ${row.id}`);
});

mkdirSync("reports", { recursive: true });
const outputPath = "reports/spotted-eats-production-directory-import.sql";
writeFileSync(outputPath, sql);
// The console rejected transaction setup even without BEGIN/COMMIT. Use only
// the one data-modifying CTE statement, which PostgreSQL executes atomically.
// No standalone SET LOCAL or LOCK commands; keep the original locked CLI file.
const [sqlHeader, sqlPayload, sqlFooter] = sql.split(delimiter);
const importStart = sqlHeader.indexOf("WITH incoming AS MATERIALIZED (");
if (importStart < 0) throw new Error("Cannot locate the single import statement.");
const consoleSql = sqlHeader.slice(importStart) + delimiter + sqlPayload + delimiter
  + sqlFooter.replace(/^COMMIT;[ \t]*(?:\r?\n|$)/gm, "");
const consoleOutputPath = "reports/spotted-eats-single-statement-import.sql";
writeFileSync(consoleOutputPath, consoleSql);
const encodedSql = JSON.stringify(consoleSql).replace(/</g, "\\u003c");
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Spotted Eats — Single-statement production import</title>
<style>body{font:16px/1.6 system-ui,sans-serif;max-width:850px;margin:40px auto;padding:0 24px;color:#172033;background:#faf8f4}h1{line-height:1.2}strong{color:#172033}.counts{display:flex;gap:16px;flex-wrap:wrap}.counts div{background:white;border:1px solid #ddd;border-radius:12px;padding:18px;flex:1}.counts b{display:block;font-size:28px}button{background:#f2bc42;border:0;border-radius:8px;padding:12px 20px;font:inherit;cursor:pointer;margin:8px 8px 8px 0}textarea{box-sizing:border-box;width:100%;height:240px;font:12px/1.5 monospace;border:1px solid #bbb;border-radius:8px;padding:12px;background:white}.note{background:#fff3cc;border-radius:10px;padding:16px}a{color:#51420a}</style></head>
<body><h1>Spotted Eats: single-statement import</h1>
<p>This handoff contains the updated import SQL. <strong>It has not been run against production.</strong> It does not publish the app or update the workspace database. Obtain explicit authorization before any live import.</p>
<div class="counts"><div><b>${rows.length}</b>restaurant listings</div><div><b>${updated}</b>validated coordinates</div><div><b>${rows.length - updated}</b>unresolved locations</div></div>
<h2>What the import does</h2>
<ul><li>Adds missing restaurants and updates matching directory records.</li><li>Includes only two source-guarded address cleanups: 800 West Tower Avenue for C'era Una Volta, and 2350 Saratoga St #166 for Vinyl. Context annotations were removed; street numbers, direction and unit were preserved.</li><li>Great China's official ZIP 94704 resolves its provider ambiguity. Great China and Vinyl have newly validated coordinates; all accepted evidence is revalidated by the generator.</li><li>Stops the whole batch if the existing duplicate/identity checks find conflicts.</li><li>No schema changes, deletions, or writes to other tables.</li><li>Preserves existing verification, ratings, review counts, promotions and subscriptions.</li><li>Leaves unresolved locations at (0,0). Census coordinates are street-address-range estimates, not verified businesses, rooftops or entrances.</li></ul>
<h2>Run the import</h2>
<ol><li>Open your Replit project's <strong>Database → Production → My Data</strong>. Confirm you selected Production and turn <strong>Edit mode ON</strong>, then open <strong>SQL</strong>.</li>
<li>Download the single-statement SQL file below, or copy its full contents. <strong>Completely clear the old SQL from the editor</strong>, then paste this new version. Its first line is <strong>WITH incoming AS MATERIALIZED (</strong>.</li>
<li>Run this <strong>one complete statement</strong>. There are no BEGIN, COMMIT, SET LOCAL or LOCK commands, and no batch-selection step. PostgreSQL executes the complete import statement atomically: either its writes succeed together or an error rolls them all back.</li>
<li>Check the returned status. <strong>IMPORTED</strong> means the import succeeded. <strong>BLOCKED_NO_CHANGES</strong> means no listings were changed; review conflict_details before proceeding.</li>
<li>On an initially empty directory, expect 296 inserted, 0 updated, and 0 conflicts. Re-running after a successful unchanged import should report 0 inserted, 0 updated, and 296 unchanged.</li>
<li>After checking the result, turn <strong>Edit mode OFF</strong>.</li></ol>
<p class="note">These are writes to your live directory. Review the script before running it. This console version has no explicit table lock: <strong>do not run another listing import or edit directory records at the same time</strong>. Existing confirmed locations are retained when the supplied address and city are unchanged and the import has no replacement coordinates.</p>
<button id="download">Download single-statement SQL</button><button id="copy">Copy single-statement SQL</button><p id="status" role="status"></p>
<textarea id="sql" readonly aria-label="Full production directory import SQL"></textarea>
<h2>Confirm the result</h2><p>Run this read-only query:</p>
<pre>SELECT COUNT(*) AS listings,
  COUNT(*) FILTER (WHERE lat &lt;&gt; 0 AND lng &lt;&gt; 0) AS with_coordinates
FROM public.venues;</pre>
<p>For an initially empty directory, expect <strong>${rows.length} listings</strong>, <strong>${updated} with coordinates</strong> and <strong>${rows.length - updated} unresolved locations</strong>. If existing records are present, use the import's counts and conflict report rather than assuming these totals.</p>
<p>Then check <a href="https://spottedeats.com/api/listings">the live listings endpoint</a> and the wheel. Cached listing responses can take up to five minutes to refresh. Nearby spins still require location permission, a selected distance, and a restaurant within that radius; the ${rows.length - updated} unresolved locations cannot appear in nearby results.</p>
<script>const sql=${encodedSql};document.getElementById('sql').value=sql;document.getElementById('download').onclick=()=>{const url=URL.createObjectURL(new Blob([sql],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='spotted-eats-single-statement-import.sql';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};document.getElementById('copy').onclick=async()=>{const status=document.getElementById('status');try{await navigator.clipboard.writeText(sql);status.textContent='Full SQL copied.'}catch{document.getElementById('sql').focus();document.getElementById('sql').select();status.textContent='Automatic copy is unavailable. The full SQL is selected; copy it manually.'}};</script></body></html>`;
writeFileSync("reports/spotted-eats-single-statement-import-guide.html", html);
writeFileSync("reports/spotted-eats-production-import-guide.html", html);
console.log(JSON.stringify({ outputPath, consoleOutputPath, listings: rows.length, withCoordinates: updated, unresolved: rows.length - updated, databaseWrites: 0 }, null, 2));
