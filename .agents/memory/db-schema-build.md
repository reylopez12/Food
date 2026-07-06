---
name: DB schema build step
description: After editing lib/db/src/schema/index.ts, the package must be rebuilt before the API server TypeScript compiler sees the new types.
---

# DB schema changes require an explicit build step

**Rule:** After any edit to `lib/db/src/schema/index.ts` (new tables, new columns, etc.):

1. Run `pnpm exec drizzle-kit push` in `lib/db/` to apply the DDL to the live DB.
2. Run `pnpm exec tsc -b` in `lib/db/` to regenerate `.d.ts` declaration files in `dist/`.

**Why:** The API server references `@workspace/db` via TypeScript project references (`tsconfig.json` → `references: [{ path: "../../lib/db" }]`). The DB package uses `composite: true` + `emitDeclarationOnly: true`, so it emits `.d.ts` files to `dist/`. If step 2 is skipped, the API server's compiler reads stale declarations and reports "has no exported member" errors for new exports.

**How to apply:** Any session that touches `lib/db/src/schema/index.ts` must run both commands before running `tsc -b` in `artifacts/api-server/`.
