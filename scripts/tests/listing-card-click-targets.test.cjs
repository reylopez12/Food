const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const ts = require("typescript");

const file = "artifacts/web/src/components/ListingCard.tsx";
const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

function classesFor(tag) {
  let classes;
  function visit(node) {
    if (ts.isJsxOpeningElement(node) && node.tagName.getText(source) === tag) {
      const attr = node.attributes.properties.find(p => ts.isJsxAttribute(p) && p.name.getText(source) === "className");
      if (attr?.initializer && ts.isStringLiteral(attr.initializer)) classes = attr.initializer.text;
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.equal(typeof classes, "string", `${tag} should have an explicit click-layer class`);
  return classes;
}

function zIndex(classes) {
  return Number(classes.match(/(?:^|\s)z-(\d+)(?:\s|$)/)?.[1] ?? 0);
}

test("listing card link receives taps over content while Save stays independently clickable", () => {
  const link = classesFor("Link");
  const content = classesFor("CardContent");
  const save = classesFor("button");
  assert.match(link, /(?:^|\s)absolute(?:\s|$)/);
  assert.match(link, /(?:^|\s)inset-0(?:\s|$)/);
  assert.doesNotMatch(link, /pointer-events-none/);
  assert.ok(zIndex(link) > zIndex(content), "Content must not cover the full-card link hit target");
  assert.ok(zIndex(save) > zIndex(link), "Save must remain above the link rather than navigate");
});
