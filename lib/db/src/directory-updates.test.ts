import assert from "node:assert/strict";
import { test } from "node:test";
import path from "node:path";
import { findWorkspaceRoot, loadDirectoryVenues } from "./directory";
import { loadDirectoryUpdates, planDirectoryUpdates, type DirectoryUpdate } from "./directory-updates";
import type { InsertVenue } from "./schema";

const assets = path.join(findWorkspaceRoot(), "attached_assets");
const existing = loadDirectoryVenues(assets);
const updates = loadDirectoryUpdates(assets);
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
