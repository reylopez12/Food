const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

// Loads a TypeScript module from lib/api-client-react/src, resolving its
// relative imports the same way.
function load(name) {
  const js = ts.transpileModule(fs.readFileSync(`lib/api-client-react/src/${name}.ts`, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const mod = { exports: {} };
  vm.runInNewContext(js, { module: mod, exports: mod.exports, require: (p) => load(p.replace("./", "")) });
  return mod.exports;
}
const mod = { exports: load("listing-search") };
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

const venue = (name, description, tags = []) =>
  ({ name, description, tags, category: "restaurants", neighborhood: "" });
const ramen = venue("Ramen Shop", "Rich tonkotsu ramen and gyoza.", ["Japanese"]);
const dimSum = venue("Golden Harbor", "Cantonese dim sum carts at lunch.", ["Chinese"]);
const bakery = venue("Sweet Rise", "Croissants and morning pastries.", ["Bakery"]);
const spanish = venue("La Marcha", "Tapas, paella and tortilla española.", ["Spanish"]);
const taqueria = venue("Taqueria Uno", "Carnitas and al pastor on handmade tortillas.", []);
const bbq = venue("Smoke House", "Texas-style barbecue brisket.", []);
const related = [ramen, dimSum, bakery, spanish, taqueria, bbq, lucky];
const find = (q) => related.filter(createListingSearch(related, q)).map((l) => l.name);

test("related terms find dishes and styles of what was searched", () => {
  assert.deepEqual(find("noodles"), ["Ramen Shop"]);
  assert.deepEqual(find("dumplings"), ["Ramen Shop", "Golden Harbor"]);
  assert.deepEqual(find("dessert"), ["Sweet Rise"]);
  assert.deepEqual(find("bbq"), ["Smoke House"]);
  assert.deepEqual(find("pinoy"), ["Lucky Three Seven"]);
  assert.deepEqual(find("mexican"), ["Taqueria Uno"]);
});

test("phrases, plurals and filler words", () => {
  assert.deepEqual(find("dim sum"), ["Golden Harbor"]);
  assert.deepEqual(find("best tacos near me"), ["Taqueria Uno"]);
  assert.deepEqual(find("pastry"), ["Sweet Rise"]);
});

test("related terms match whole words only", () => {
  // "tortilla" is Mexican-related only as typed; "masa" must not match "masala".
  assert.ok(!find("mexican").includes("La Marcha"));
  const masala = venue("Curry Corner", "Chicken tikka masala.", ["Indian"]);
  assert.ok(createListingSearch([masala], "indian")(masala));
  assert.ok(!createListingSearch([masala], "mexican")(masala));
});

test("misspelled food words use their related terms", () => {
  assert.deepEqual(find("noodels"), ["Ramen Shop"]);
  assert.deepEqual(find("desert"), ["Sweet Rise"]);
});
