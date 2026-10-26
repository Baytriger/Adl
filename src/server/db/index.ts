import "server-only";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const url = process.env.DATABASE_URL ?? "";
if (!/^postgres(ql)?:\/\//.test(url) && process.env.NEXT_PHASE !== "phase-production-build") {
  throw new Error(
    "DATABASE_URL must be a Postgres connection string (postgresql://user:password@host:5432/database). " +
      "ADL no longer uses a SQLite file.",
  );
}

const local = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url);

const globalForDb = globalThis as unknown as { __adlSql?: ReturnType<typeof postgres> };

function connect() {
  return postgres(url || "postgresql://build:build@localhost:5432/build", {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 15,
    // Poolers in transaction mode (Supabase port 6543) do not support prepared statements.
    prepare: false,
    ssl: local ? false : "require",
  });
}

export const sql = globalForDb.__adlSql ?? connect();
if (process.env.NODE_ENV !== "production") globalForDb.__adlSql = sql;

export const db = drizzle(sql, { schema });
export { schema };

/** Creates the tables on first start. Safe to run on every start. */
export async function ensureSchema() {
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT,
      role TEXT NOT NULL DEFAULT 'viewer', active BOOLEAN NOT NULL DEFAULT TRUE,
      password_hash TEXT, must_change BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ, last_login TIMESTAMPTZ);
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY, full_name TEXT NOT NULL, email TEXT, region TEXT NOT NULL,
      level TEXT NOT NULL, joined_at TIMESTAMPTZ NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ);
    CREATE INDEX IF NOT EXISTS members_region_idx ON members(region);
    CREATE UNIQUE INDEX IF NOT EXISTS members_email_uq ON members(email);
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, starts_at TIMESTAMPTZ NOT NULL, region TEXT,
      turned_up INTEGER NOT NULL DEFAULT 0, participated INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ);
    CREATE INDEX IF NOT EXISTS events_starts_idx ON events(starts_at);
    CREATE TABLE IF NOT EXISTS media_pages (
      id TEXT PRIMARY KEY, platform TEXT NOT NULL, handle TEXT NOT NULL, url TEXT,
      followers INTEGER NOT NULL DEFAULT 0, posts INTEGER NOT NULL DEFAULT 0,
      recorded_at TIMESTAMPTZ NOT NULL);
    CREATE UNIQUE INDEX IF NOT EXISTS media_platform_handle_uq ON media_pages(platform, handle);
    CREATE TABLE IF NOT EXISTS import_runs (
      id TEXT PRIMARY KEY, dataset TEXT NOT NULL, started_at TIMESTAMPTZ NOT NULL, finished_at TIMESTAMPTZ,
      status TEXT NOT NULL, rows_ok INTEGER NOT NULL DEFAULT 0, rows_bad INTEGER NOT NULL DEFAULT 0,
      note TEXT, by_email TEXT);
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY, at TIMESTAMPTZ NOT NULL, actor TEXT NOT NULL, action TEXT NOT NULL,
      target TEXT, detail TEXT);
    CREATE INDEX IF NOT EXISTS audit_at_idx ON audit_log(at);
  `);
}
