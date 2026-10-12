const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

// Execute the actual pure distance helpers and wheel eligibility callbacks,
// extracted with the TypeScript parser. No separate test-only filter algorithm.
function source(file) {
  return ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}
function findNode(file, predicate) {
  let found;
  function visit(node) {
    if (predicate(node)) found = node;
    else ts.forEachChild(node, visit);
  }
  visit(source(file));
  assert.ok(found, `Missing tested implementation in ${file}`);
  return found;
}
function functionSource(file, name) {
  return findNode(file, node => ts.isFunctionDeclaration(node) && node.name?.text === name).getText().replace(/^export\s+/, "");
}
function memoSource(file, name) {
  const variable = findNode(file, node => ts.isVariableDeclaration(node) && node.name.getText() === name);
  assert.ok(ts.isCallExpression(variable.initializer));
  return variable.initializer.arguments[0].getText();
}
function evaluate(code, context = {}) {
  const js = ts.transpileModule(code, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  return vm.runInNewContext(js, context);
}
const platforms = [
  {
    name: "web", helpers: "artifacts/web/src/hooks/useNearMe.ts",
    spin: "artifacts/web/src/pages/Spin.tsx", home: "artifacts/web/src/components/HomeSpin.tsx",
  },
  {
    name: "mobile", helpers: "artifacts/mobile/context/DirectoryContext.tsx",
    spin: "artifacts/mobile/app/(tabs)/spin.tsx", home: "artifacts/mobile/components/HomeSpinWidget.tsx",
  },
];
// Web home wheel also applies the shared exact-tier price helper.
const spinHelpers = (() => {
  const js = ts.transpileModule(fs.readFileSync("artifacts/web/src/lib/spinWheel.ts", "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(js, { module, exports: module.exports });
  return module.exports;
})();
for (const platform of platforms) {
  const haversineDistanceMi = evaluate(`(${functionSource(platform.helpers, "haversineDistanceMi")})`);
  const hasValidCoordinates = evaluate(`(${functionSource(platform.helpers, "hasValidCoordinates")})`);
  for (const radius of [1, 5, 10, 25]) {
    test(`${platform.name}: full spin and home spin exclude outside/unknown coordinates at ${radius} miles`, () => {
      const userLat = 37.78, userLng = -122.26;
      const location = miles => userLat + (miles / 3958.8) * (180 / Math.PI);
      const allListings = [
        { id: "inside", lat: location(radius - 0.001), lng: userLng },
        { id: "outside", lat: location(radius + 0.001), lng: userLng },
        { id: "far", lat: 38.0, lng: -121.0 },
        { id: "unknown", lat: 0, lng: 0 },
        { id: "invalid", lat: 95, lng: userLng },
      ];
      const context = { allListings, userLat, userLng, radius, preferredRadius: radius,
        locationReady: true, hasValidCoordinates, haversineDistanceMi,
        shuffled: values => values, MAX_SLOTS: 10, MAX_HOME_SPOTS: 10, MAX_DIR_SLOTS: 10,
        priceFilter: "any", matchesPriceTier: spinHelpers.matchesPriceTier };
      const full = evaluate(`(${memoSource(platform.spin, "nearbyListings")})()`, context);
      const home = evaluate(`(${memoSource(platform.home, "spinItems")})()`, context);
      assert.deepEqual(Array.from(full, item => item.listing.id), ["inside"]);
      assert.deepEqual(Array.from(home, item => item.id), ["inside"]);
      for (const item of [...full, ...home]) assert.ok(item.distanceMi <= radius);
      const empty = { ...context, allListings: allListings.filter(item => item.id !== "inside") };
      assert.equal(evaluate(`(${memoSource(platform.spin, "nearbyListings")})()`, empty).length, 0);
      assert.equal(evaluate(`(${memoSource(platform.home, "spinItems")})()`, empty).length, 0);
    });
  }
  test(`${platform.name}: full directory spin needs both location permission and chosen radius`, () => {
    const context = { locationReady: false };
    assert.equal(evaluate(`(${memoSource(platform.spin, "nearbyListings")})()`, context).length, 0);
  });
}

test("web: home spin with an explicit radius never falls back to all listings without location", () => {
  const allListings = [{ id: "a", lat: 37.78, lng: -122.26, priceRange: "$" }, { id: "b", lat: 0, lng: 0, priceRange: "" }];
  const base = { allListings, userLat: null, userLng: null, priceFilter: "any", matchesPriceTier: spinHelpers.matchesPriceTier,
    hasValidCoordinates: () => true, haversineDistanceMi: () => 0, shuffled: v => v, MAX_SLOTS: 10 };
  const home = ctx => evaluate(`(${memoSource("artifacts/web/src/components/HomeSpin.tsx", "spinItems")})()`, ctx);
  assert.equal(home({ ...base, radius: 5, locationReady: false }).length, 0);
  assert.deepEqual(Array.from(home({ ...base, radius: null, locationReady: false }), i => i.id), ["a", "b"]);
  assert.deepEqual(Array.from(home({ ...base, radius: null, locationReady: false, priceFilter: "$" }), i => i.id), ["a"]);
});
