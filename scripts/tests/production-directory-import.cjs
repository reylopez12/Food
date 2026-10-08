// Exercise the handoff in an isolated, in-memory PostgreSQL instance only.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { createRequire } = require("node:module");
const path = require("node:path");
const dbRequire = createRequire(path.resolve("lib/db/package.json"));
const { PGlite } = dbRequire("@electric-sql/pglite");

async function main() {
  const sql = fs.readFileSync("reports/spotted-eats-production-directory-import.sql", "utf8");
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE TABLE venues (
        id text PRIMARY KEY, name text NOT NULL, category text NOT NULL, rating real NOT NULL,
        "reviewCount" integer NOT NULL, address text NOT NULL, city text NOT NULL,
        neighborhood text NOT NULL, phone text NOT NULL, website text NOT NULL,
        hours text NOT NULL, description text NOT NULL, tags jsonb NOT NULL,
        featured boolean NOT NULL DEFAULT false, verified boolean NOT NULL DEFAULT false,
        "priceRange" text NOT NULL, color text NOT NULL, initials text NOT NULL,
        "hasVideo" boolean NOT NULL DEFAULT false, video jsonb DEFAULT NULL,
        lat real NOT NULL, lng real NOT NULL, broadcaster_active boolean NOT NULL DEFAULT false
      );
      CREATE TABLE untouched_fixture (id integer PRIMARY KEY, value text);
      INSERT INTO untouched_fixture VALUES (1, 'preserve me');
    `);
    const run = async () => {
      const results = await db.exec(sql);
      return results.find(result => result.rows?.[0]?.status)?.rows[0];
    };
    const first = await run();
    assert.equal(first.status, "IMPORTED");
    assert.equal(first.inserted, 296);
    assert.equal(first.conflicts, 0);
    const counts = (await db.query("SELECT count(*) AS total, count(*) FILTER (WHERE lat <> 0 AND lng <> 0) AS located FROM venues")).rows[0];
    assert.equal(counts.total, 296);
    assert.equal(counts.located, 250);
    assert.equal(counts.total - counts.located, 46);
    const addresses = (await db.query("SELECT id, address, city, lat, lng FROM venues WHERE id IN ('c-era-una-volta-alameda', 'vinyl-wine-bar-shop-alameda', 'great-china-berkeley') ORDER BY id")).rows;
    assert.equal(addresses[0].address, "800 West Tower Avenue");
    assert.equal(addresses[0].lat, 0);
    assert.equal(addresses[1].address, "2190 Bancroft Way");
    assert.equal(addresses[2].address, "2350 Saratoga St #166");
    for (const row of addresses.slice(1)) {
      assert.notEqual(row.lat, 0);
      assert.notEqual(row.lng, 0);
    }
    const second = await run();
    assert.equal(second.status, "IMPORTED");
    assert.equal(second.inserted, 0);
    assert.equal(second.updated, 0);
    assert.equal(second.unchanged, 296);

    // Upgrading the old 248-pin payload must correct both annotated addresses
    // and add only the two newly confirmed pins, without adding IDs or badges.
    await db.query("UPDATE venues SET address = $1, lat = 0, lng = 0 WHERE id = $2",
      ["800 West Tower Avenue (inside SoFive Soccer Center / The Hub)", "c-era-una-volta-alameda"]);
    await db.query("UPDATE venues SET address = $1, lat = 0, lng = 0, verified = true, rating = 4.9, \"reviewCount\" = 77 WHERE id = $2",
      ["2350 Saratoga St #166 (Alameda Point)", "vinyl-wine-bar-shop-alameda"]);
    await db.query("UPDATE venues SET lat = 0, lng = 0 WHERE id = 'great-china-berkeley'");
    const upgrade = await run();
    assert.equal(upgrade.status, "IMPORTED");
    assert.equal(upgrade.inserted, 0);
    assert.equal(upgrade.updated, 3);
    const vinyl = (await db.query("SELECT * FROM venues WHERE id = 'vinyl-wine-bar-shop-alameda'")).rows[0];
    assert.equal(vinyl.address, "2350 Saratoga St #166");
    assert.equal(vinyl.verified, true);
    assert.equal(vinyl.reviewCount, 77);
    assert.ok(Math.abs(vinyl.rating - 4.9) < 0.00001);
    const afterUpgrade = (await db.query("SELECT count(*) AS total, count(*) FILTER (WHERE lat <> 0 AND lng <> 0) AS located FROM venues")).rows[0];
    assert.equal(afterUpgrade.total, 296);
    assert.equal(afterUpgrade.located, 250);
    const upgradeRerun = await run();
    assert.equal(upgradeRerun.updated, 0);
    assert.equal(upgradeRerun.unchanged, 296);

    const id = (await db.query("SELECT id FROM venues WHERE lat <> 0 ORDER BY id LIMIT 1")).rows[0].id;
    await db.query(`UPDATE venues SET verified = true, featured = true,
      broadcaster_active = true, "hasVideo" = true, video = '{"original":true}',
      rating = 4.8, "reviewCount" = 99, phone = 'old phone', lat = 0, lng = 0 WHERE id = $1`, [id]);
    const updated = await run();
    assert.equal(updated.status, "IMPORTED");
    assert.equal(updated.updated, 1);
    const preserved = (await db.query("SELECT * FROM venues WHERE id = $1", [id])).rows[0];
    for (const key of ["verified", "featured", "broadcaster_active", "hasVideo"]) assert.equal(preserved[key], true);
    assert.equal(preserved.reviewCount, 99);
    assert.ok(Math.abs(preserved.rating - 4.8) < 0.00001);
    assert.deepEqual(preserved.video, { original: true });
    assert.notEqual(preserved.lat, 0);

    // An ambiguous identity must prevent even unrelated directory changes.
    await db.query(`INSERT INTO venues SELECT 'ambiguous-fixture', name, category, rating,
      "reviewCount", '999 Different St', city, neighborhood, phone, website, hours,
      description, tags, featured, verified, "priceRange", color, initials,
      "hasVideo", video, lat, lng, broadcaster_active FROM venues WHERE id = $1`, [id]);
    await db.query("UPDATE venues SET phone = 'must remain unchanged' WHERE id = $1", [id]);
    const snapshot = async () => JSON.stringify((await db.query("SELECT * FROM venues ORDER BY id")).rows);
    const before = await snapshot();
    const blocked = await run();
    assert.equal(blocked.status, "BLOCKED_NO_CHANGES");
    assert.equal(blocked.inserted, 0);
    assert.equal(blocked.updated, 0);
    assert.ok(blocked.conflicts > 0);
    assert.equal(await snapshot(), before);
    assert.deepEqual((await db.query("SELECT * FROM untouched_fixture")).rows, [{ id: 1, value: "preserve me" }]);
    console.log("PASS: 296 listings, 250 coordinates, 46 unresolved, corrected addresses, safe upgrade/rerun, protected fields and conflict-blocked atomic import. No real database accessed.");
  } finally {
    await db.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
