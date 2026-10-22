const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const js = ts.transpileModule(fs.readFileSync("lib/api-client-react/src/listing-search.ts", "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const mod = { exports: {} };
vm.runInNewContext(js, { module: mod, exports: mod.exports });
const { createListingSearch } = mod.exports;
const listings = [];
const matches = (listing, q) => createListingSearch(listings, q)(listing);

const lucky = {
  name: "Lucky Three Seven",
  description: "Hole-in-the-wall Filipino wings and lumpia spot; owner known for handing out free samples.",
  tags: ["Filipino"],
  category: "restaurants",
  neighborhood: "Fruitvale",
};
const pizza = {
  name: "Slice House",
  description: "New York-style pizza by the slice.",
  tags: ["Pizza"],
  category: "restaurants",
  neighborhood: "Downtown",
};
const thai = {
  name: "Chai Corner",
  description: "Thai noodles, curries and chai that are worth the trip.",
  tags: ["Thai"],
  category: "restaurants",
  neighborhood: "Temescal",
};

listings.push(lucky, pizza, thai);

test("exact and partial searches still match", () => {
  for (const q of ["", "  ", "filipino", "FILIPINO", "lucky three", "lump", "fruitvale"]) {
    assert.ok(matches(lucky, q), q);
  }
});

test("small typos match", () => {
  for (const q of ["filipno", "filpino", "fillipino", "phillipino", "flipino", "lumpai", "filipn"]) {
    assert.ok(matches(lucky, q), q);
  }
});

test("filler words are ignored and every remaining word must match", () => {
  assert.ok(matches(lucky, "filipino food"));
  assert.ok(matches(lucky, "best filipno restaurant near me"));
  assert.ok(matches(lucky, "filipino wings"));
  assert.ok(!matches(lucky, "filipino pizza"));
});

test("unrelated searches do not match", () => {
  for (const q of ["pizza", "thai", "sushi", "taco"]) {
    assert.ok(!matches(lucky, q), q);
  }
  assert.ok(!matches(pizza, "filipno"));
});

test("words found exactly somewhere in the directory are not typo-matched", () => {
  // "thai" exists, so it must not loosely match "that" or "chai" elsewhere.
  assert.ok(matches(thai, "thai"));
  assert.ok(!matches(lucky, "thai"));
  assert.ok(!matches(pizza, "thai"));
  assert.ok(matches(thai, "thia"));
  assert.ok(!matches(lucky, "thia"));
});
