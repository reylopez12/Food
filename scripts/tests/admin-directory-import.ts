/**
 * Runs the real HTTP import handlers against an isolated, in-memory database.
 * Never writes to the workspace or production database.
 * Run: artifacts/web/node_modules/.bin/tsx scripts/tests/admin-directory-import.ts
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { eq } from "../../lib/db/node_modules/drizzle-orm/index.js";
import * as schema from "../../lib/db/src/schema/index";
import { buildImportPlan, digest, loadImportCandidates, parseImportInput } from "../../lib/db/src/directory-import";
import { signImportApproval } from "../../artifacts/api-server/src/lib/import-confirmation";

const dbRequire = createRequire(path.resolve("lib/db/package.json"));
const apiRequire = createRequire(path.resolve("artifacts/api-server/package.json"));
const { PGlite } = dbRequire("@electric-sql/pglite");
const { drizzle } = dbRequire("drizzle-orm/pglite");
const express = apiRequire("express");
const pg = new PGlite();
await pg.exec(`
CREATE TABLE venues (
 id text PRIMARY KEY, name text NOT NULL, category text NOT NULL,
 rating real NOT NULL, "reviewCount" integer NOT NULL, address text NOT NULL,
 city text NOT NULL, neighborhood text NOT NULL, phone text NOT NULL,
 website text NOT NULL, hours text NOT NULL, description text NOT NULL,
 tags jsonb NOT NULL, featured boolean NOT NULL DEFAULT false,
 verified boolean NOT NULL DEFAULT false, "priceRange" text NOT NULL,
 color text NOT NULL, initials text NOT NULL, "hasVideo" boolean NOT NULL DEFAULT false,
 video jsonb, lat real NOT NULL, lng real NOT NULL,
 broadcaster_active boolean NOT NULL DEFAULT false
);
CREATE TABLE unrelated_records (value text);
INSERT INTO unrelated_records VALUES ('leave me alone');
`);
const database = drizzle(pg, { schema });
// Fixture-only process settings, never persisted to Replit or its workflows.
process.env.ADMIN_EMAILS = "import-admin@example.test,other-admin@example.test";
const { createDirectoryImportRouter } = await import("../../artifacts/api-server/src/routes/directory-import");
const { pool } = await import("../../lib/db/src/index");
const app = express();
app.use(express.json({ limit: "2mb" }));
app.use((req: any, _res: unknown, next: () => void) => {
  const role = req.headers["x-test-user"];
  req.isAuthenticated = () => Boolean(role);
  if (role) req.user = {
    id: role, email: role === "admin" ? "import-admin@example.test"
      : role === "other-admin" ? "other-admin@example.test" : "ordinary@example.test",
  };
  req.log = { info() {}, warn() {} };
  next();
});
app.use("/api/admin/listings/import", createDirectoryImportRouter(database, () => "development"));
const server = app.listen(0, "127.0.0.1");
await new Promise<void>((resolve) => server.once("listening", resolve));
const port = (server.address() as { port: number }).port;
async function request(action: string, input: unknown, user: string | null = "admin", headers = {}) {
  const response = await fetch(`http://127.0.0.1:${port}/api/admin/listings/import/${action}`, {
    method: "POST", headers: { "Content-Type": "application/json",
      ...(user ? { "x-test-user": user } : {}), ...headers },
    body: JSON.stringify(input),
  });
  return { status: response.status, body: await response.json() as any };
}
const csv = (content: string) => ({ source: "csv", files: [{ name: "Alameda.csv", content }] });
const prepared = loadImportCandidates({ source: "prepared" });
const originalPlan = buildImportPlan(prepared, []);
assert.equal(prepared.length, 296);
assert.equal(originalPlan.summary.blocked, 0);
assert.equal(prepared.filter((entry) => entry.venue!.lat && entry.venue!.lng).length, 250);

const fixture = {
  ...originalPlan.additions[0], id: "test-cafe", name: "Test Cafe", city: "Alameda, CA",
  address: "101 Park Street", initials: "TC", description: "Original description",
  lat: 37.76, lng: -122.25, rating: 4.8, reviewCount: 43,
  verified: true, featured: true, broadcasterActive: true, hasVideo: true,
  video: { dish: "Soup", tagline: "Existing video", descriptors: ["A", "B", "C"], accentColor: "#ffffff" },
};
const reset = async () => {
  await pg.exec("DELETE FROM venues");
  await database.insert(schema.venuesTable).values(fixture);
};
const rows = async () => await database.select().from(schema.venuesTable);
let checks = 0;
function pass(name: string) { checks++; console.log(`PASS ${name}`); }

try {
  await reset();
  assert.equal((await request("preview", { source: "prepared" }, null)).status, 401);
  assert.equal((await request("confirm", { source: "prepared" }, "ordinary")).status, 403);
  assert.equal((await request("preview", { source: "prepared" }, "admin", { Origin: "https://evil.test" })).status, 403);
  assert.equal((await request("preview", { source: "prepared" }, "admin", { "Sec-Fetch-Site": "cross-site" })).status, 403);
  pass("unauthenticated, non-admin and cross-site requests denied");

  const input = csv("Restaurant,Address,City,Description,Rating,Verified,Featured,broadcasterActive\n"
    + "Test Cafe,101 Park Street,Alameda,Updated description,1,false,false,false\n"
    + "New Cafe,202 Oak Street,Alameda,New restaurant,5,true,true,true\n");
  const preview = await request("preview", input);
  assert.equal(preview.status, 200);
  assert.deepEqual(preview.body.summary, { added: 1, updated: 1, unchanged: 0, blocked: 0 });
  assert.equal((await rows()).length, 1);
  assert.equal((await rows())[0].description, fixture.description);
  assert(preview.body.rows[0].changes.some((change: any) =>
    change.field === "description" && change.before === fixture.description && change.after === "Updated description"));
  assert(!preview.body.rows[0].changes.some((change: any) => ["rating", "verified", "featured"].includes(change.field)));
  pass("preview reports additions and before/after changes without writes");

  assert.equal((await request("confirm", input)).status, 400);
  assert.equal((await request("confirm", { ...input, previewToken: "forged.token" })).status, 409);
  assert.equal((await request("confirm", { ...input, previewToken: preview.body.previewToken }, "other-admin")).status, 409);
  const different = csv("Restaurant,Address,City\nDifferent Cafe,222 Oak Street,Alameda\n");
  assert.equal((await request("confirm", { ...different, previewToken: preview.body.previewToken })).status, 409);
  pass("confirmation requires signed approval from the same admin and unchanged source");

  const committed = await request("confirm", { ...input, previewToken: preview.body.previewToken });
  assert.equal(committed.status, 200);
  const imported = await rows();
  const updated = imported.find((row: any) => row.id === fixture.id)!;
  const added = imported.find((row: any) => row.name === "New Cafe")!;
  for (const field of ["rating", "reviewCount", "verified", "featured", "broadcasterActive", "hasVideo", "video"]) {
    assert.deepEqual(updated[field], fixture[field as keyof typeof fixture]);
  }
  assert.equal(updated.lat, fixture.lat);
  assert.equal(updated.lng, fixture.lng);
  assert.equal(added.rating, 0);
  assert.equal(added.reviewCount, 0);
  assert.equal(added.verified, false);
  assert.equal(added.featured, false);
  assert.equal(added.broadcasterActive, false);
  assert.equal(added.lat, 0);
  assert.equal(added.lng, 0);
  assert.deepEqual((await pg.query("SELECT * FROM unrelated_records")).rows, [{ value: "leave me alone" }]);
  pass("save updates and inserts only restaurants, preserving protected values and unknown locations");

  assert.equal((await request("confirm", { ...input, previewToken: preview.body.previewToken })).status, 409);
  const rerun = await request("preview", input);
  assert.deepEqual(rerun.body.summary, { added: 0, updated: 0, unchanged: 2, blocked: 0 });
  pass("consumed preview cannot replay writes; an unchanged rerun is a no-op");

  const dupes = csv("Restaurant,Address,City\nTest Cafe,101 Park St,Alameda\nTEST CAFE,101 Park Street,Alameda\n");
  const dupePreview = await request("preview", dupes);
  assert.equal(dupePreview.body.summary.blocked, 2);
  assert.equal((await request("confirm", { ...dupes, previewToken: dupePreview.body.previewToken })).status, 409);
  assert.equal((await rows()).length, 2);
  pass("both duplicate rows are flagged and the entire batch is blocked");

  const shared = csv("Restaurant,Address,City\nDifferent Business,101 Park Street,Alameda\n");
  assert.equal((await request("preview", shared)).body.summary.blocked, 1);
  const wrongId = csv("ID,Restaurant,Address,City\ntest-cafe,Different Business,303 Park Street,Alameda\n");
  assert.equal((await request("preview", wrongId)).body.summary.blocked, 1);
  pass("ambiguous shared-address and wrong-identity ID matches are flagged");

  const stale = await request("preview", input);
  await database.update(schema.venuesTable).set({ rating: 4.9 }).where(eq(schema.venuesTable.id, fixture.id));
  assert.equal((await request("confirm", { ...input, previewToken: stale.body.previewToken })).status, 409);
  pass("any intervening directory edit invalidates the preview");

  const expired = signImportApproval({ owner: "admin", expires: 1, target: "development",
    sourceHash: digest(loadImportCandidates(input as any)), databaseHash: "irrelevant" });
  assert.equal((await request("confirm", { ...input, previewToken: expired })).status, 409);
  pass("expired previews cannot save");

  await reset();
  const move = csv("Restaurant,Address,City,Description\nTest Cafe,303 Park Street,Alameda,Moved\n");
  const movePreview = await request("preview", move);
  assert(movePreview.body.rows[0].changes.some((change: any) => change.field === "lat" && change.after === "0"));
  assert.equal((await request("confirm", { ...move, previewToken: movePreview.body.previewToken })).status, 200);
  assert.equal((await rows())[0].lat, 0);
  assert.equal((await rows())[0].verified, true);
  pass("moved restaurants lose incompatible pins but not protected verification settings");

  await reset();
  await pg.exec(`ALTER TABLE venues ADD CONSTRAINT test_fail_update CHECK (description <> 'Reject this update')`);
  const failing = csv("Restaurant,Address,City,Description\n"
    + "Test Cafe,101 Park Street,Alameda,Reject this update\n"
    + "Rollback Cafe,404 Park Street,Alameda,Should roll back\n");
  const failingPreview = await request("preview", failing);
  assert.equal((await request("confirm", { ...failing, previewToken: failingPreview.body.previewToken })).status, 409);
  assert.equal((await rows()).length, 1);
  assert.equal((await rows())[0].description, fixture.description);
  pass("late update failure rolls back earlier inserts atomically");
  await pg.exec("ALTER TABLE venues DROP CONSTRAINT test_fail_update");

  for (const content of [
    "Restaurant,Address,City\nBad,unknown,Alameda\n",
    "Restaurant,Address,City,Website\nBad,555 Park Street,Alameda,javascript:alert(1)\n",
    "Restaurant,Restaurant,Address,City\nA,B,111 Street,Alameda\n",
    "Restaurant,Address,City\nA,\"unclosed,Alameda\n",
    "Restaurant,Address,City,Lat,Lng\nBad,555 Park Street,Alameda,200,1\n",
  ]) {
    const result = await request("preview", csv(content));
    assert.equal(result.status, 200);
    assert(result.body.summary.blocked > 0);
  }
  assert.throws(() => parseImportInput(csv("x".repeat(1024 * 1024 + 1))), /1 MB/);
  pass("invalid CSV, unsafe URLs, placeholders, coordinates, duplicate headers and oversized files rejected");

  const multi = { source: "csv", files: [
    { name: "Alameda.csv", content: "Restaurant,Address,City\nSame,555 Park Street,Alameda\n" },
    { name: "other.csv", content: "Restaurant,Address,City\nSame,555 Park Street,Alameda\n" },
  ] };
  assert.equal((await request("preview", multi)).body.summary.blocked, 2);
  pass("duplicate detection spans multiple uploaded files");
  pass("prepared directory previews all 296 listings with 250 validated locations");
  console.log(`All ${checks} import safety checks passed against an isolated database; no live writes.`);
} finally {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await pg.close();
  await pool?.end();
}
