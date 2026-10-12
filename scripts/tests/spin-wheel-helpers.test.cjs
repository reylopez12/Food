const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const js = ts.transpileModule(fs.readFileSync("artifacts/web/src/lib/spinWheel.ts", "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const mod = { exports: {} };
vm.runInNewContext(js, { module: mod, exports: mod.exports });
const h = mod.exports;

test("price filter matches exact stored tiers; any includes unspecified", () => {
  assert.deepEqual(Array.from(h.PRICE_FILTER_OPTIONS, o => o.id), ["any", "$", "$$", "$$$", "$$$$"]);
  assert.ok(h.matchesPriceTier("", "any"));
  assert.ok(h.matchesPriceTier("$$$$", "$$$$"));
  assert.ok(!h.matchesPriceTier("$$$$", "$$$"));
  assert.ok(!h.matchesPriceTier("", "$"));
  assert.ok(!h.matchesPriceTier("$$", "$"));
});

test("custom entries ignore blanks, update, clear and reset", () => {
  let e = h.emptyCustomEntries();
  assert.equal(e.length, 6);
  assert.equal(h.customSpinItems(e).length, 0);
  e = h.updateCustomEntry(e, 0, "  Tacos ");
  e = h.updateCustomEntry(e, 2, "   ");
  e = h.updateCustomEntry(e, 4, "x".repeat(40));
  assert.deepEqual(Array.from(h.customSpinItems(e), i => i.name), ["Tacos", "x".repeat(30)]);
  assert.deepEqual(Array.from(h.customSpinItems(e), i => i.id), ["custom-0", "custom-4"]);
  e = h.updateCustomEntry(e, 0, "");
  assert.equal(h.customSpinItems(e).length, 1);
  assert.equal(h.updateCustomEntry(e, 9, "nope"), e);
  assert.deepEqual(Array.from(h.emptyCustomEntries()), ["", "", "", "", "", ""]);
});

// Exercise the actual homepage component handlers without a browser or canvas.
// Hook state is retained between renders; only the external environment is stubbed.
function homeHarness(listings) {
  const slots = [];
  let cursor = 0;
  let frames = [];
  const location = { status: "idle", userLat: null, userLng: null, radius: null };
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial;
      return [slots[i], value => { slots[i] = typeof value === "function" ? value(slots[i]) : value; }];
    },
    useRef(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = { current: initial };
      return slots[i];
    },
    useMemo: fn => fn(),
    useCallback: fn => fn,
    useEffect() {},
  };
  const jsx = (type, props) => ({ type, props });
  const module = { exports: {} };
  const compiled = ts.transpileModule(fs.readFileSync("artifacts/web/src/components/HomeSpin.tsx", "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const imports = {
    react,
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "framer-motion": { AnimatePresence: "AnimatePresence", motion: { div: "motion.div" } },
    wouter: { useLocation: () => ["/", () => {}] },
    "lucide-react": new Proxy({}, { get: (_target, key) => String(key) }),
    "@/components/ui/button": { Button: "Button" },
    "@/components/ui/badge": { Badge: "Badge" },
    "@workspace/api-client-react": { useListings: () => ({ data: listings, isPending: false, isError: false }) },
    "../hooks/useNearMe": {
      hasValidCoordinates: () => false,
      haversineDistanceMi: () => { throw new Error("Unexpected location filtering in editor-state test"); },
      useNearMe: () => ({
        ...location,
        setRadius: value => { location.radius = value; },
        requestLocation: () => { location.status = "requesting"; },
      }),
    },
    "@/lib/spinWheel": h,
    "./spin/HomeSpinControls": { HomeSpinControls: "HomeSpinControls" },
    "./spin/CustomChoicesPanel": { CustomChoicesPanel: "CustomChoicesPanel" },
  };
  vm.runInNewContext(compiled, {
    module, exports: module.exports,
    require(name) {
      assert.ok(name in imports, `Unexpected component dependency: ${name}`);
      return imports[name];
    },
    requestAnimationFrame(callback) { frames.push(callback); return frames.length; },
    cancelAnimationFrame() { frames = []; },
  });
  return {
    render() { cursor = 0; return module.exports.HomeSpin(); },
    finishSpin() {
      assert.equal(frames.length, 1);
      frames.shift()(0);
      frames.shift()(4201);
    },
  };
}

function findElement(node, predicate) {
  if (!node || typeof node !== "object") return undefined;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findElement(child, predicate);
      if (found) return found;
    }
    return undefined;
  }
  if (predicate(node)) return node;
  return findElement(node.props?.children, predicate);
}
const controls = tree => findElement(tree, el => el.type === "HomeSpinControls").props;
const customPanel = tree => findElement(tree, el => el.type === "CustomChoicesPanel")?.props;
const spinButton = tree => findElement(tree, el => el.props?.["data-testid"] === "button-home-spin").props;
const winnerHeading = tree => findElement(tree, el => el.type === "h3");

test("homepage custom editor preserves entries, locks edits during spinning and clears stale winners", () => {
  const app = homeHarness([]);
  controls(app.render()).onEditorChange("custom");
  let tree = app.render();
  assert.equal(customPanel(tree).entries.length, 6);
  assert.equal(spinButton(tree).disabled, true);
  customPanel(tree).onChange(0, "  Tacos  ");
  tree = app.render();
  assert.equal(customPanel(tree).filledCount, 1);
  assert.equal(spinButton(tree).disabled, false);
  spinButton(tree).onClick();
  tree = app.render();
  assert.equal(controls(tree).disabled, true);
  assert.equal(customPanel(tree).disabled, true);
  customPanel(tree).onChange(0, "Not allowed during spin");
  controls(tree).onEditorChange("price");
  assert.equal(controls(app.render()).editor, "custom");
  assert.equal(customPanel(app.render()).entries[0], "  Tacos  ");
  app.finishSpin();
  tree = app.render();
  assert.equal(winnerHeading(tree).props.children, "Tacos");
  customPanel(tree).onChange(0, "Pizza");
  tree = app.render();
  assert.equal(winnerHeading(tree), undefined);
  controls(tree).onEditorChange("price");
  assert.equal(customPanel(app.render()), undefined);
  controls(app.render()).onEditorChange("custom");
  tree = app.render();
  assert.equal(customPanel(tree).entries[0], "Pizza");
  customPanel(tree).onReset();
  assert.equal(customPanel(app.render()).filledCount, 0);
  assert.equal(spinButton(app.render()).disabled, true);
});

test("homepage price changes rebuild eligible choices and retain price when distance is cleared", () => {
  const app = homeHarness([
    { id: "cheap", name: "Budget place", priceRange: "$", color: "#112233" },
    { id: "custom-premium", name: "Premium place", priceRange: "$$$$", color: "#445566" },
  ].map(listing => ({ category: "restaurants", initials: "SE", neighborhood: "", description: "", rating: 0, ...listing })));
  controls(app.render()).onEditorChange("price");
  controls(app.render()).onPriceChange("$$$$");
  assert.equal(spinButton(app.render()).disabled, false);
  spinButton(app.render()).onClick();
  app.finishSpin();
  assert.equal(winnerHeading(app.render()).props.children, "Premium place");
  controls(app.render()).onPriceChange("$$");
  assert.equal(winnerHeading(app.render()), undefined);
  assert.equal(spinButton(app.render()).disabled, true);
  controls(app.render()).onPriceChange("$$$$");
  controls(app.render()).onEditorChange("distance");
  controls(app.render()).onRadiusChange(5);
  assert.equal(spinButton(app.render()).disabled, true);
  controls(app.render()).onEditorChange("price");
  assert.equal(controls(app.render()).radius, 5);
  assert.equal(controls(app.render()).priceFilter, "$$$$");
  controls(app.render()).onClearRadius();
  assert.equal(controls(app.render()).priceFilter, "$$$$");
  assert.equal(spinButton(app.render()).disabled, false);
});
