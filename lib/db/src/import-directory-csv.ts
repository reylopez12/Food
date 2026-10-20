import { db, pool } from "./index";
import { venuesTable } from "./schema";
import { findWorkspaceRoot } from "./directory";
import { loadDirectoryUpdateBatch, loadSeedDirectoryVenues, planDirectoryUpdates } from "./directory-updates";
import { eq, sql } from "drizzle-orm";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

async function main() {
  const root = findWorkspaceRoot(path.dirname(fileURLToPath(import.meta.url)));
  const assetsDir = path.join(root, "attached_assets");
  const batch = loadDirectoryUpdateBatch(assetsDir);
  const { updates } = batch;
  const check = process.argv.includes("--check");
  const seed = process.argv.includes("--seed");
  const result = await db.transaction(async (tx) => {
    // Serialize imports and prevent concurrent listing edits while comparing.
    await tx.execute(sql`LOCK TABLE venues IN SHARE ROW EXCLUSIVE MODE`);
    const current = await tx.select().from(venuesTable);
    const pending = seed
      ? loadSeedDirectoryVenues(assetsDir).map((venue) => ({
          venue, fields: [], source: "seed", row: 0, notes: "",
        }))
      : updates;
    const plan = planDirectoryUpdates(current, pending);
    if (!check) {
      for (const action of plan.actions) {
        const venue = plan.venues.find((item) => item.id === action.id)!;
        if (action.kind === "new") {
          await tx.insert(venuesTable).values(venue).onConflictDoNothing();
        } else if (action.kind === "updated" && !seed) {
          const patch = Object.fromEntries(action.fields.map((field) => [field, venue[field as keyof typeof venue]]));
          await tx.update(venuesTable).set(patch).where(eq(venuesTable.id, action.id));
        }
      }
    }
    return plan;
  });
  result.flags.unshift(...batch.flags);
  const summary = {
    mode: check ? "preview" : seed ? "seed-missing-only" : "applied",
    inputRows: batch.inputRows,
    ignoredFormattingRows: batch.ignoredRows,
    added: result.actions.filter((action) => action.kind === "new").length,
    updated: result.actions.filter((action) => action.kind === "updated").length,
    unchanged: result.actions.filter((action) => action.kind === "unchanged").length,
    skipped: seed ? 0 : batch.inputRows - result.actions.length,
    duplicateMatches: result.flags.filter((flag) => flag.reason.includes("instead of creating a duplicate")).length,
    flagged: result.flags.length,
    total: result.venues.length,
  };
  const reportDir = path.join(root, "reports");
  mkdirSync(reportDir, { recursive: true });
  const quote = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const rows = [
    ["Result", "Restaurant", "Listing ID", "File", "CSV row", "Changed fields / flag", "Source verification notes"],
    ...result.actions.map((action) => [action.kind, action.name, action.id, action.source, action.row,
      action.fields.join("; "), updates.find((entry) => entry.source === action.source && entry.row === action.row)?.notes]),
    ...result.flags.map((flag) => ["flagged", flag.name, "", flag.source, flag.row, flag.reason, ""]),
  ];
  writeFileSync(path.join(reportDir, "directory-import.csv"), "\uFEFF" + rows.map((row) => row.map(quote).join(",")).join("\n"));
  writeFileSync(path.join(reportDir, "directory-import.json"), JSON.stringify({ summary, ...result, venues: undefined }, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  console.log("Report: reports/directory-import.csv");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => pool?.end());
