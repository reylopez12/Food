const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const root = path.resolve(__dirname, "../..");
const wrapper = fs.readFileSync(path.join(root, "artifacts/web/src/lib/analytics.ts"), "utf8");
const compiled = ts.transpileModule(wrapper, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function load(window) {
  const module = { exports: {} };
  const context = { module, exports: module.exports, Promise };
  if (window !== undefined) context.window = window;
  vm.runInNewContext(compiled, context);
  return module.exports;
}

test("tracking is a safe no-op in SSR and when analytics is not enabled", () => {
  for (const browser of [undefined, {}, { umami: undefined }]) {
    assert.doesNotThrow(() => load(browser).trackEvent("wheel_spin_started", { mode: "custom", options_count: 2 }));
  }
});

test("passes a custom event and flat metadata to the injected tracker exactly once", () => {
  const calls = [];
  const api = load({ umami: { track: (...args) => calls.push(args) } });
  const data = { mode: "custom", options_count: 3 };
  api.trackEvent("wheel_spin_completed", data);
  assert.deepEqual(calls, [["wheel_spin_completed", data]]);
});

test("a throwing tracker cannot break an application action", () => {
  const api = load({ umami: { track() { throw new Error("tracker unavailable"); } } });
  assert.doesNotThrow(() => api.trackEvent("listing_viewed", { listing_id: "public-venue-id" }));
});

test("rejected tracker requests are handled rather than leaking unhandled rejections", async () => {
  const api = load({ umami: { track() { return Promise.reject(new Error("network unavailable")); } } });
  api.trackEvent("wheel_spin_started", { mode: "directory", options_count: 10 });
  await new Promise(setImmediate);
});

test("registered event names are unique snake_case names shorter than 50 characters", () => {
  const names = Array.from(load().ANALYTICS_EVENTS);
  assert.equal(new Set(names).size, names.length);
  for (const name of names) {
    assert.match(name, /^[a-z][a-z0-9_]*$/);
    assert.ok(name.length < 50);
  }
});

test("every registered event is instrumented with explicitly reviewed metadata, not private content", () => {
  const files = [
    "pages/Explore.tsx", "pages/ListingDetail.tsx", "pages/Spin.tsx", "pages/Partners.tsx",
    "components/ListingCard.tsx", "components/admin/DirectoryImport.tsx",
  ];
  const allowedKeys = new Set([
    "view", "search_mode", "results_count", "listing_id", "category", "saved", "location",
    "mode", "options_count", "action", "interest", "source", "target",
    "added", "updated", "unchanged", "blocked",
  ]);
  const forbiddenValues = new Set([
    "email", "phone", "address", "name", "content", "files", "previewToken",
    "searchQuery", "userLat", "userLng", "businessName", "contactName", "message",
  ]);
  const seen = new Set();

  function validateMetadata(node) {
    if (ts.isParenthesizedExpression(node)) return validateMetadata(node.expression);
    if (ts.isConditionalExpression(node)) {
      validateMetadata(node.whenTrue);
      validateMetadata(node.whenFalse);
      return;
    }
    assert.ok(ts.isObjectLiteralExpression(node), "Event metadata must use explicit properties, not whole forms/files");
    for (const property of node.properties) {
      if (ts.isSpreadAssignment(property)) {
        validateMetadata(property.expression);
        continue;
      }
      assert.ok(ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property));
      assert.ok(allowedKeys.has(property.name.getText().replace(/['"]/g, "")), `Unreviewed property ${property.name.getText()}`);
    }
  }

  for (const file of files) {
    const source = ts.createSourceFile(file, fs.readFileSync(path.join(root, "artifacts/web/src", file), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function visit(node) {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "trackEvent") {
        assert.ok(ts.isStringLiteral(node.arguments[0]));
        seen.add(node.arguments[0].text);
        validateMetadata(node.arguments[1]);
        function checkValue(child) {
          if (ts.isIdentifier(child)) assert.ok(!forbiddenValues.has(child.text), `Private content reference ${child.text}`);
          ts.forEachChild(child, checkValue);
        }
        checkValue(node.arguments[1]);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  assert.deepEqual([...seen].sort(), Array.from(load().ANALYTICS_EVENTS).sort());
});
