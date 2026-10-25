import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";

/** Stages from the Data Living sign-up form ("Where are you on your data journey?"). */
export const LEVELS = ["starting", "exploring", "learning", "switching", "entry", "mid", "professional", "other"] as const;
export type Level = (typeof LEVELS)[number];
export const LEVEL_LABELS: Record<Level, string> = {
  starting: "Just getting started",
  exploring: "Just curious / exploring",
  learning: "Actively learning",
  switching: "Switching careers into data",
  entry: "Intern / entry-level",
  mid: "Junior / mid-level",
  professional: "Professional",
  other: "Other",
};
export const ROLES = ["admin", "editor", "viewer"] as const;
export type Role = (typeof ROLES)[number];

const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const now = () => integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date());

export const users = sqliteTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name"),
  role: text("role", { enum: ROLES }).notNull().default("viewer"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  /** scrypt hash, never the password. Null means the person cannot sign in yet. */
  passwordHash: text("password_hash"),
  /** True while the password is one an admin chose or generated. */
  mustChange: integer("must_change", { mode: "boolean" }).notNull().default(false),
  createdAt: now(),
  lastLogin: integer("last_login", { mode: "timestamp" }),
});

export const members = sqliteTable(
  "members",
  {
    id: id(),
    fullName: text("full_name").notNull(),
    email: text("email"),
    region: text("region").notNull(),
    level: text("level", { enum: LEVELS }).notNull(),
    joinedAt: integer("joined_at", { mode: "timestamp" }).notNull(),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: now(),
  },
  (t) => [index("members_region_idx").on(t.region), uniqueIndex("members_email_uq").on(t.email)],
);

export const events = sqliteTable(
  "events",
  {
    id: id(),
    title: text("title").notNull(),
    startsAt: integer("starts_at", { mode: "timestamp" }).notNull(),
    region: text("region"),
    /** People who turned up to the event. */
    turnedUp: integer("turned_up").notNull().default(0),
    /** Of those, how many actively participated. Never exceeds turnedUp. */
    participated: integer("participated").notNull().default(0),
    createdAt: now(),
  },
  (t) => [index("events_starts_idx").on(t.startsAt)],
);

export const mediaPages = sqliteTable(
  "media_pages",
  {
    id: id(),
    platform: text("platform").notNull(),
    handle: text("handle").notNull(),
    url: text("url"),
    followers: integer("followers").notNull().default(0),
    posts: integer("posts").notNull().default(0),
    recordedAt: integer("recorded_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [uniqueIndex("media_platform_handle_uq").on(t.platform, t.handle)],
);

export const importRuns = sqliteTable("import_runs", {
  id: id(),
  dataset: text("dataset").notNull(),
  startedAt: integer("started_at", { mode: "timestamp" }).notNull(),
  finishedAt: integer("finished_at", { mode: "timestamp" }),
  status: text("status", { enum: ["success", "partial", "failed"] }).notNull(),
  rowsOk: integer("rows_ok").notNull().default(0),
  rowsBad: integer("rows_bad").notNull().default(0),
  note: text("note"),
  byEmail: text("by_email"),
});

export const auditLog = sqliteTable(
  "audit_log",
  {
    id: id(),
    at: integer("at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    actor: text("actor").notNull(),
    action: text("action").notNull(),
    target: text("target"),
    detail: text("detail"),
  },
  (t) => [index("audit_at_idx").on(t.at)],
);
