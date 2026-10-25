import "server-only";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "node:path";
import * as schema from "./schema";

const url = process.env.DATABASE_URL?.replace(/^file:/, "") ?? "./adl.db";
const file = url === ":memory:" ? url : path.resolve(/*turbopackIgnore: true*/ process.cwd(), url);

const globalForDb = globalThis as unknown as { __adlSqlite?: Database.Database };

function open() {
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT,
      role TEXT NOT NULL DEFAULT 'viewer', active INTEGER NOT NULL DEFAULT 1,
      password_hash TEXT, must_change INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER, last_login INTEGER);
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY, full_name TEXT NOT NULL, email TEXT, region TEXT NOT NULL,
      level TEXT NOT NULL, joined_at INTEGER NOT NULL, active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER);
    CREATE INDEX IF NOT EXISTS members_region_idx ON members(region);
    CREATE UNIQUE INDEX IF NOT EXISTS members_email_uq ON members(email);
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, starts_at INTEGER NOT NULL, region TEXT,
      turned_up INTEGER NOT NULL DEFAULT 0, participated INTEGER NOT NULL DEFAULT 0, created_at INTEGER);
    CREATE INDEX IF NOT EXISTS events_starts_idx ON events(starts_at);
    CREATE TABLE IF NOT EXISTS media_pages (
      id TEXT PRIMARY KEY, platform TEXT NOT NULL, handle TEXT NOT NULL, url TEXT,
      followers INTEGER NOT NULL DEFAULT 0, posts INTEGER NOT NULL DEFAULT 0,
      recorded_at INTEGER NOT NULL);
    CREATE UNIQUE INDEX IF NOT EXISTS media_platform_handle_uq ON media_pages(platform, handle);
    CREATE TABLE IF NOT EXISTS import_runs (
      id TEXT PRIMARY KEY, dataset TEXT NOT NULL, started_at INTEGER NOT NULL, finished_at INTEGER,
      status TEXT NOT NULL, rows_ok INTEGER NOT NULL DEFAULT 0, rows_bad INTEGER NOT NULL DEFAULT 0,
      note TEXT, by_email TEXT);
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY, at INTEGER NOT NULL, actor TEXT NOT NULL, action TEXT NOT NULL,
      target TEXT, detail TEXT);
    CREATE INDEX IF NOT EXISTS audit_at_idx ON audit_log(at);
  `);
  // Databases created before password sign-in lack these columns.
  const cols = (sqlite.prepare("PRAGMA table_info(users)").all() as { name: string }[]).map((c) => c.name);
  if (!cols.includes("password_hash")) sqlite.exec("ALTER TABLE users ADD COLUMN password_hash TEXT");
  if (!cols.includes("must_change")) sqlite.exec("ALTER TABLE users ADD COLUMN must_change INTEGER NOT NULL DEFAULT 0");
  return sqlite;
}

const sqlite = globalForDb.__adlSqlite ?? open();
if (process.env.NODE_ENV !== "production") globalForDb.__adlSqlite = sqlite;

export const db = drizzle(sqlite, { schema });
export { schema };
