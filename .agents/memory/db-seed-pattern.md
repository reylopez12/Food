---
name: DB schema + seed pattern
description: venuesTable definition, how to push schema, and how to run the seed script
---

# DB schema & seed pattern

## venuesTable
Defined in `lib/db/src/schema/index.ts`. Uses camelCase property names that match the JS Listing interface (e.g. `reviewCount`, `priceRange`, `hasVideo`). `tags` and `video` are stored as `jsonb`.

## Pushing schema
```
cd lib/db && pnpm run push
```

## Running the seed
tsx is not on PATH globally. Use the binary from the web workspace:
```
./artifacts/web/node_modules/.bin/tsx lib/db/src/seed.ts
```
Or via `pnpm --filter @workspace/db run seed` (script added to lib/db/package.json).

**Why:** The seed uses `onConflictDoNothing()` so it's safe to re-run.

## Listing type
The shared `Listing` type lives in `lib/api-client-react/src/generated/api.schemas.ts` and is exported from `@workspace/api-client-react`. Components should import from there, not from the static data files.

## Static data files
`artifacts/web/src/data/listings.ts` and `artifacts/mobile/constants/data.ts` are kept as reference but no longer used at runtime. `CATEGORIES` in the mobile constants file is still used by UI filter components.
