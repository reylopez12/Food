import assert from "node:assert/strict";
import { test } from "node:test";
import { addressParts, locationPatch, validateCensusMatches, type CensusMatch } from "./geocoding";
import { withVerifiedLocations, verifiedLocationEvidence } from "./verified-locations";
import { findWorkspaceRoot } from "./directory";
import { loadSeedDirectoryVenues, planDirectoryUpdates } from "./directory-updates";
import path from "node:path";

const input = { id: "restaurant", name: "Restaurant", address: "1713 Webster Street", city: "Alameda, CA" };
const match: CensusMatch = {
  matchedAddress: "1713 WEBSTER ST, ALAMEDA, CA, 94501",
  coordinates: { x: -122.276817850187, y: 37.776412503292 },
  addressComponents: { city: "ALAMEDA", state: "CA" },
  tigerLine: { tigerLineId: "657860959", side: "L" },
};

test("accepts only a unique exact street and city/state match, including equivalent abbreviations", () => {
  const result = validateCensusMatches(input, [match]);
  assert.equal(result.status, "accepted");
  assert.equal(result.precision, "street-address-range");
  assert.equal(result.lat, match.coordinates.y);
});

test("holds unmatched, duplicate, wrong-number/street/direction/city and invalid coordinates for review", () => {
  for (const matches of [
    [], [match, match],
    [{ ...match, matchedAddress: "1715 WEBSTER ST, ALAMEDA, CA, 94501" }],
    [{ ...match, matchedAddress: "1713 BROADWAY, ALAMEDA, CA, 94501" }],
    [{ ...match, matchedAddress: "1713 N WEBSTER ST, ALAMEDA, CA, 94501" }],
    [{ ...match, addressComponents: { city: "OAKLAND", state: "CA" } }],
    [{ ...match, matchedAddress: "1713 WEBSTER ST, OAKLAND, CA, 94612" }],
    [{ ...match, coordinates: { x: 0, y: 0 } }],
    [{ ...match, coordinates: { x: NaN, y: 37.7 } }],
    [{ ...match, coordinates: { x: -74, y: 40.7 } }],
  ]) {
    const result = validateCensusMatches(input, matches);
    assert.equal(result.status, "review");
    assert.equal(result.lat, undefined);
    assert.equal(result.lng, undefined);
  }
});

test("does not geocode city-only addresses, intersections, ranges or unconfirmed notes", () => {
  for (const address of ["Alameda", "Webster & Park", "1713-1715 Webster St", "1713 Webster St (verify address)", "1713 Unknown St"]) {
    assert.equal(addressParts({ ...input, address }), null);
  }
  assert.equal(addressParts({ ...input, address: "1713 Webster St #E" })?.street, "1713 Webster St");
  assert.equal(addressParts({ ...input, address: "1713 Webster St, #E" })?.street, "1713 Webster St");
});

test("coordinate-only patch preserves identity, metadata and existing owner coordinates", () => {
  const evidence = validateCensusMatches(input, [match]);
  const venue = { ...input, lat: 0, lng: 0 };
  assert.deepEqual(locationPatch(venue, evidence), { lat: evidence.lat, lng: evidence.lng });
  assert.equal(locationPatch({ ...venue, id: "other-id" }, evidence), null);
  assert.equal(locationPatch({ ...venue, address: "1715 Webster St" }, evidence), null);
  assert.equal(locationPatch({ ...venue, city: "Oakland, CA" }, evidence), null);
  assert.equal(locationPatch({ ...venue, lat: 37.7, lng: -122.2 }, evidence), null);
  assert.equal(locationPatch(venue, { ...evidence, lat: 37.8 }), null);
});

test("bundled seed uses only address-bound accepted evidence and never marks restaurants verified", () => {
  const venues = loadSeedDirectoryVenues(path.join(findWorkspaceRoot(), "attached_assets"));
  assert.ok(verifiedLocationEvidence.length > 0);
  for (const evidence of verifiedLocationEvidence) {
    assert.equal(validateCensusMatches(evidence, evidence.matches).status, "accepted");
    const venue = venues.find(item => item.id === evidence.id);
    if (venue && venue.address === evidence.address && venue.city === evidence.city) {
      assert.equal(venue.lat, evidence.lat);
      assert.equal(venue.lng, evidence.lng);
      assert.equal(venue.verified, false);
    }
  }
  assert.deepEqual(withVerifiedLocations(venues), venues);
});

test("an uploaded address change invalidates its old pin without changing other venue fields", () => {
  const venue = loadSeedDirectoryVenues(path.join(findWorkspaceRoot(), "attached_assets"))[0];
  const current = { ...venue, lat: 37.7, lng: -122.2 };
  const updated = { ...venue, address: "123 Different St" };
  const plan = planDirectoryUpdates([current], [{
    venue: updated, fields: ["address"], source: "test.csv", row: 1, notes: "",
  }]);
  assert.deepEqual(plan.venues[0], { ...current, address: updated.address, lat: 0, lng: 0 });
  assert.ok(plan.actions[0].fields.includes("lat"));
  assert.ok(plan.actions[0].fields.includes("lng"));
});
