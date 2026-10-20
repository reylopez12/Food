import assert from "node:assert/strict";
import { test } from "node:test";
import reviews from "./data/venue-address-reviews.json";
import { confirmedPostalCode, withConfirmedAddresses } from "./confirmed-addresses";
import { loadSeedDirectoryVenues } from "./directory-updates";
import { findWorkspaceRoot } from "./directory";
import { locationPatch, validateCensusMatches, type CensusMatch } from "./geocoding";
import path from "node:path";

test("review covers all 48 original unresolved IDs once with evidence or explicit uncertainty", () => {
  assert.equal(reviews.length, 48);
  assert.equal(new Set(reviews.map(item => item.id)).size, 48);
  for (const item of reviews) {
    assert.ok(item.source.startsWith("https://"));
    assert.ok(item.note);
    if (item.status === "confirmed") {
      assert.ok(item.address && item.city && item.quote);
    }
  }
});

test("confirmed corrections preserve IDs and metadata and are guarded by original address and city", () => {
  const seeded = loadSeedDirectoryVenues(path.join(findWorkspaceRoot(), "attached_assets"));
  for (const review of reviews.filter(item => item.previousAddress)) {
    const original = { ...seeded.find(item => item.id === review.id)!,
      address: review.previousAddress!, rating: 4.5, reviewCount: 12, verified: true, lat: 37.8, lng: -122.2 };
    const [corrected] = withConfirmedAddresses([original]);
    assert.deepEqual(corrected, { ...original, address: review.address, lat: 0, lng: 0 });
    assert.deepEqual(withConfirmedAddresses([corrected]), [corrected]);
    const moved = { ...original, address: "999 New Street" };
    assert.deepEqual(withConfirmedAddresses([moved]), [moved]);
    const otherCity = { ...original, city: "Oakland, CA" };
    assert.deepEqual(withConfirmedAddresses([otherCity]), [otherCity]);
  }
  assert.equal(new Set(seeded.map(item => item.id)).size, seeded.length);
});

test("ZIP hint belongs only to the officially confirmed ID, address and city", () => {
  const input = { id: "great-china-berkeley", name: "Great China", address: "2190 Bancroft Way", city: "Berkeley, CA" };
  assert.equal(confirmedPostalCode(input), "94704");
  assert.equal(confirmedPostalCode({ ...input, id: "other" }), undefined);
  assert.equal(confirmedPostalCode({ ...input, address: "2192 Bancroft Way" }), undefined);
  assert.equal(confirmedPostalCode({ ...input, city: "Oakland, CA" }), undefined);
});

test("ZIP narrowing still requires one exact street/city match and revalidates on application", () => {
  const input = { id: "great-china-berkeley", name: "Great China", address: "2190 Bancroft Way", city: "Berkeley, CA", zip: "94704" };
  const match: CensusMatch = {
    matchedAddress: "2190 BANCROFT WAY, BERKELEY, CA, 94704",
    addressComponents: { city: "BERKELEY", state: "CA" },
    coordinates: { x: -122.26613158828, y: 37.867759148153 },
    tigerLine: { side: "R", tigerLineId: "606159958" },
  };
  const accepted = validateCensusMatches(input, [match]);
  assert.equal(accepted.status, "accepted");
  assert.equal(validateCensusMatches(input, [match, match]).status, "review");
  assert.equal(validateCensusMatches(input, [{ ...match, matchedAddress: "2190 BANCROFT WAY, BERKELEY, CA, 94703" }]).status, "review");
  assert.equal(validateCensusMatches(input, [{ ...match, matchedAddress: "2190 W BANCROFT WAY, BERKELEY, CA, 94704" }]).status, "review");
  assert.ok(locationPatch({ ...input, lat: 0, lng: 0 }, accepted));
  assert.equal(locationPatch({ ...input, lat: 0, lng: 0 }, { ...accepted, zip: "94703" }), null);
});
