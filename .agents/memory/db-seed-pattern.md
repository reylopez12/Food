---
name: DB seed pattern
description: How to run the seed script and the venues table shape; includes a gotcha about tsx not being in the workspace root PATH.
---

## Running the seed

`tsx` is not in `lib/db`'s own node_modules. Use the binary from an artifact that has it installed:

```bash
/home/runner/workspace/artifacts/web/node_modules/.bin/tsx /home/runner/workspace/lib/db/src/seed.ts
```

This seeds 12 Bay Area venues into the `venues` PostgreSQL table.

## When the venues table goes empty

The venues table will be emptied if `drizzle-kit push` is run with the `--force` flag or if the Replit DB is recreated. After any `push`, verify count with:

```bash
psql "$DATABASE_URL" -c "SELECT count(*) FROM venues;"
```

If count = 0, re-run the seed command above.

**Why:** The `pnpm --filter @workspace/db run seed` command fails silently because tsx is not in the monorepo root's PATH — it only lives inside artifact-level node_modules.

## Venues table shape (venuesTable in lib/db/src/schema/index.ts)

Key columns: id (text PK/slug), name, category, rating (real), reviewCount, address, city, neighborhood, phone, website, hours, description, tags (jsonb), featured, verified, priceRange, color, initials, hasVideo, video (jsonb nullable), lat, lng.

## Auth + follows tables

Added in `lib/db/src/schema/auth.ts`: `sessionsTable`, `usersTable`.
Added in `lib/db/src/schema/index.ts`: `followsTable` (userId, venueId, unique index; toggle via transaction with FOR UPDATE lock).
