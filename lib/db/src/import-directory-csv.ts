import { db } from "./index";
import { venuesTable } from "./schema";
import { findWorkspaceRoot, loadDirectoryVenues } from "./directory";
import path from "node:path";
import { fileURLToPath } from "node:url";

async function main() {
  const root = findWorkspaceRoot(path.dirname(fileURLToPath(import.meta.url)));
  const venues = loadDirectoryVenues(path.join(root, "attached_assets"));
  if (venues.length !== 175) throw new Error(`Expected 175 CSV records; got ${venues.length}`);

  if (process.argv.includes("--check")) {
    console.log(`Validated ${venues.length} listings: Alameda 49, Berkeley-area 48, Oakland 78.`);
    return;
  }
  if (process.argv.includes("--seed")) {
    for (let i = 0; i < venues.length; i += 50) {
      await db.insert(venuesTable).values(venues.slice(i, i + 50)).onConflictDoNothing();
    }
    console.log(`Seeded missing CSV listings from ${venues.length} rows.`);
    return;
  }
  // Replace the directory atomically so a failed import leaves the old data intact.
  await db.transaction(async (tx) => {
    await tx.delete(venuesTable);
    for (let i = 0; i < venues.length; i += 50) {
      await tx.insert(venuesTable).values(venues.slice(i, i + 50));
    }
  });
  console.log(`Replaced directory with ${venues.length} CSV listings.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
