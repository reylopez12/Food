import { mkdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { count } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import pg from "pg";
import { findWorkspaceRoot, loadDirectoryVenues } from "./directory";
import * as schema from "./schema";

const { Pool } = pg;

/**
 * With no DATABASE_URL we fall back to an embedded Postgres (PGlite) stored
 * under `.local/pglite`, so the app runs locally with zero setup. Production
 * must always provide a real database.
 */
export const isEmbeddedDatabase = !process.env.DATABASE_URL;

if (isEmbeddedDatabase && process.env.NODE_ENV === "production") {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const workspaceRoot = findWorkspaceRoot();

function createEmbedded() {
  const dataDir = process.env.PGLITE_DIR ?? path.join(workspaceRoot, ".local", "pglite");
  mkdirSync(dataDir, { recursive: true });
  return new PGlite(dataDir);
}

const embedded = isEmbeddedDatabase ? createEmbedded() : null;

export const pool = isEmbeddedDatabase
  ? null
  : new Pool({ connectionString: process.env.DATABASE_URL });

// Both drivers expose the same query-builder API; type as node-postgres so
// callers see a single database type.
export const db: NodePgDatabase<typeof schema> = embedded
  ? (drizzlePglite(embedded, { schema }) as unknown as NodePgDatabase<typeof schema>)
  : drizzle(pool!, { schema });

// Mirrors ./schema — only used to bootstrap the embedded database.
// Real databases are migrated with `pnpm --filter @workspace/db run push`.
const EMBEDDED_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS sessions (
  sid varchar PRIMARY KEY,
  sess jsonb NOT NULL,
  expire timestamp NOT NULL
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions (expire);

CREATE TABLE IF NOT EXISTS users (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar UNIQUE,
  first_name varchar,
  last_name varchar,
  profile_image_url varchar,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS venues (
  id text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  rating real NOT NULL,
  "reviewCount" integer NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  neighborhood text NOT NULL,
  phone text NOT NULL,
  website text NOT NULL,
  hours text NOT NULL,
  description text NOT NULL,
  tags jsonb NOT NULL,
  featured boolean NOT NULL DEFAULT false,
  verified boolean NOT NULL DEFAULT false,
  "priceRange" text NOT NULL,
  color text NOT NULL,
  initials text NOT NULL,
  "hasVideo" boolean NOT NULL DEFAULT false,
  video jsonb DEFAULT null,
  lat real NOT NULL,
  lng real NOT NULL,
  broadcaster_active boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS follows (
  id text PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  venue_id text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS follows_user_venue_idx ON follows (user_id, venue_id);

CREATE TABLE IF NOT EXISTS announcements (
  id text PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id text NOT NULL,
  posted_by_id text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL DEFAULT 'general',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id text PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  announcement_id text NOT NULL,
  read_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS partner_inquiries (
  id text PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  website text NOT NULL DEFAULT '',
  venue_id text,
  interest text NOT NULL DEFAULT 'listing',
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'new',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feedback (
  id text PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT 'general',
  venue_id text,
  topic text NOT NULL DEFAULT 'other',
  message text NOT NULL,
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  user_id text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamp NOT NULL DEFAULT now()
);
`;

/**
 * Prepare the database before serving. For the embedded database this
 * creates tables and seeds the directory from the bundled CSVs on first run.
 */
export async function ensureDatabase(): Promise<void> {
  if (!embedded) return;
  await embedded.exec(EMBEDDED_SCHEMA_SQL);
  const [{ value }] = await db.select({ value: count() }).from(schema.venuesTable);
  if (value > 0) return;
  const venues = loadDirectoryVenues(path.join(workspaceRoot, "attached_assets"));
  for (let i = 0; i < venues.length; i += 50) {
    await db.insert(schema.venuesTable).values(venues.slice(i, i + 50)).onConflictDoNothing();
  }
}

export * from "./schema";
