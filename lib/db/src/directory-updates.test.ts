import assert from "node:assert/strict";
import { test } from "node:test";
import path from "node:path";
import { findWorkspaceRoot, loadDirectoryVenues, PREVIOUS_DIRECTORY_FILES } from "./directory";
import { loadDirectoryUpdates, loadDirectoryUpdateBatch, loadSeedDirectoryVenues, planDirectoryUpdates, type DirectoryUpdate } from "./directory-updates";
import type { InsertVenue } from "./schema";

const assets = path.join(findWorkspaceRoot(), "attached_assets");
const existing = loadDirectoryVenues(assets);
const updates = loadDirectoryUpdates(assets, PREVIOUS_DIRECTORY_FILES);
const first = existing[0];
const entry = (venue: InsertVenue, fields: DirectoryUpdate["fields"] = ["description"]): DirectoryUpdate =>
  ({ venue, fields, source: "test.csv", row: 2, notes: "" });

test("all 175 uploaded rows match existing venues without additional records", () => {
  const plan = planDirectoryUpdates(existing, updates);
  assert.equal(plan.venues.length, 175);
  assert.equal(plan.actions.filter((action) => action.kind === "new").length, 0);
  assert.deepEqual(plan.venues.map((venue) => venue.id), existing.map((venue) => venue.id));
  assert.equal(plan.flags.length, 1);
  assert.match(plan.flags[0].reason, /Damaged characters/);
  assert.equal(updates.find((item) => item.venue.name.includes("Casa Revol"))!.venue.name, "Casa Revolución Taqueria");
});

test("running an import again is idempotent", () => {
  const firstPass = planDirectoryUpdates(existing, updates);
  const repeat = planDirectoryUpdates(firstPass.venues, updates);
  assert.equal(repeat.actions.filter((action) => action.kind !== "unchanged").length, 0);
  assert.deepEqual(repeat.venues, firstPass.venues);
});

test("duplicate input rows are skipped and flagged", () => {
  const plan = planDirectoryUpdates([], [entry(first), entry(first)]);
  assert.equal(plan.venues.length, 1);
  assert.equal(plan.actions.length, 1);
  assert.match(plan.flags[0].reason, /Duplicate input row/);
});

test("updates preserve IDs, reviews, coordinates, saved-link identity and owner metadata", () => {
  const current = { ...first, id: "owner-id", featured: true, verified: true, rating: 4.9, reviewCount: 20,
    lat: 37.7, lng: -122.2, broadcasterActive: true };
  const plan = planDirectoryUpdates([current], [entry({ ...first, description: "New supplied description" })]);
  assert.deepEqual(plan.venues[0], { ...current, description: "New supplied description" });
});

test("same-name restaurants in different cities remain distinct", () => {
  const plan = planDirectoryUpdates([first], [entry({ ...first, id: "other-city", city: "Oakland, CA" })]);
  assert.equal(plan.venues.length, 2);
});

test("multiple existing matches are flagged, not overwritten or duplicated", () => {
  const plan = planDirectoryUpdates([first, { ...first, id: "duplicate-id" }], [entry(first)]);
  assert.equal(plan.actions.length, 0);
  assert.match(plan.flags[0].reason, /Ambiguous match/);
});

test("shared addresses without a matching name or phone are flagged for review", () => {
  const plan = planDirectoryUpdates([first], [entry({ ...first, id: "new-name", name: "Different Restaurant", phone: "" })]);
  assert.equal(plan.venues.length, 1);
  assert.match(plan.flags[0].reason, /Shared address/);
});

test("missing uploaded columns do not clear existing website or hours", () => {
  const plan = planDirectoryUpdates(existing.map((venue) => ({ ...venue, hours: "Verified hours" })), updates);
  const action = plan.actions.find((item) => item.id === first.id)!;
  assert.ok(!action.fields.includes("hours"));
  assert.equal(plan.venues[0].hours, "Verified hours");
});

test("rows not included in the import remain untouched", () => {
  const plan = planDirectoryUpdates(existing, [entry({ ...first, description: "Updated" })]);
  assert.equal(plan.venues.length, existing.length);
  assert.deepEqual(plan.venues.slice(1), existing.slice(1));
});

test("a shorter summary does not silently reopen a temporarily closed venue", () => {
  const closed = { ...first, description: "Temporarily closed. Old description" };
  const plan = planDirectoryUpdates([closed], [entry({ ...first, description: "New summary" })]);
  assert.equal(plan.venues[0].description, "Temporarily closed. New summary");
});

test("latest uploads handle partial records and the second Alameda table without invented descriptions", () => {
  const batch = loadDirectoryUpdateBatch(assets);
  assert.equal(batch.inputRows, 147);
  assert.equal(batch.ignoredRows, 4);
  assert.equal(batch.flags.length, 8);
  assert.equal(batch.updates.length, 139);
  const dragon = batch.updates.find((item) => item.venue.name === "Dragon Rouge")!;
  assert.equal(dragon.row, 38);
  assert.equal(dragon.venue.address, "2337 Blanding Ave");
  assert.equal(dragon.venue.phone, "(510) 521-1800");
  assert.equal(dragon.venue.description, "");
  assert.ok(!dragon.fields.includes("description"));
  assert.ok(dragon.notes.includes("Verification next step"));
  const oakland = batch.updates.find((item) => item.venue.name === "3 Bottled Fish")!;
  assert.ok(!oakland.fields.includes("description"));
  assert.ok(!oakland.fields.includes("verified"));
  const alley = batch.updates.find((item) => item.venue.name === "Alley & Vine")!;
  assert.ok(alley.fields.includes("description"));
  assert.equal(alley.venue.website, "https://alleyandvine.com");
});

test("restaurant aliases with matching street and phone update the existing ID and flag the duplicate", () => {
  const old = { ...first, id: "old-cera-id", name: "C'era Una Volta", address: "800 W Tower Ave", phone: "510-769-4828" };
  const incoming = { ...old, id: "new-cera-id", name: "C'era Una Volta Kitchen & Catering",
    address: "800 West Tower Avenue (inside SoFive Soccer Center / The Hub)", phone: "(510) 769-4828" };
  const plan = planDirectoryUpdates([old], [entry(incoming, ["name", "address", "phone"])]);
  assert.equal(plan.venues.length, 1);
  assert.equal(plan.actions[0].id, old.id);
  assert.equal(plan.actions[0].kind, "updated");
  assert.match(plan.flags[0].reason, /instead of creating a duplicate/);
  const unitPlan = planDirectoryUpdates(
    [{ ...old, name: "A-Town Pizza and Kabob House", address: "2327 Blanding Ave" }],
    [entry({ ...incoming, name: "A Town Pizza", address: "2327 Blanding Ave #E" })],
  );
  assert.equal(unitPlan.venues.length, 1);
  assert.equal(unitPlan.actions[0].id, old.id);
});

test("partial uploaded records preserve all existing descriptions and older source ratings", () => {
  const previous = planDirectoryUpdates(existing, updates).venues;
  const currentBatch = loadDirectoryUpdateBatch(assets);
  const plan = planDirectoryUpdates(previous, currentBatch.updates);
  const ids = new Set(plan.venues.map((venue) => venue.id));
  assert.ok(previous.every((venue) => ids.has(venue.id)));
  for (const venue of previous.filter((item) => item.city === "Oakland, CA")) {
    const imported = plan.venues.find((item) => item.id === venue.id)!;
    assert.equal(imported.description, venue.description);
    assert.equal(imported.rating, venue.rating);
  }
  const repeated = planDirectoryUpdates(plan.venues, currentBatch.updates);
  assert.equal(repeated.actions.filter((action) => action.kind !== "unchanged").length, 0);
  assert.equal(loadSeedDirectoryVenues(assets).length, plan.venues.length);
  assert.equal(new Set(plan.venues.map((venue) => `${venue.city}|${venue.name}`)).size, plan.venues.length);
});
