import "server-only";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db, schema } from "./db";
import { LEVEL_LABELS } from "./db/schema";

const { members, events, mediaPages, importRuns } = schema;

export type Range = { from?: Date; to?: Date };

export type Freshness = "current" | "stale" | "empty";
const STALE_AFTER_DAYS = 30;

export function freshness(last: Date | null | undefined): Freshness {
  if (!last) return "empty";
  const age = Date.now() - last.getTime();
  return age > STALE_AFTER_DAYS * 86_400_000 ? "stale" : "current";
}

/** Single definition of every headline metric. Dashboards and reports call these. */
export function memberMetrics() {
  const [{ total }] = db
    .select({ total: sql<number>`count(*)` })
    .from(members)
    .where(eq(members.active, true))
    .all();
  const byRegion = db
    .select({ label: members.region, value: sql<number>`count(*)` })
    .from(members)
    .where(eq(members.active, true))
    .groupBy(members.region)
    .orderBy(desc(sql`count(*)`))
    .all();
  const byLevel = db
    .select({ label: members.level, value: sql<number>`count(*)` })
    .from(members)
    .where(eq(members.active, true))
    .groupBy(members.level)
    .orderBy(desc(sql`count(*)`))
    .all();
  return { total, byRegion, byLevel: byLevel.map((r) => ({ ...r, label: LEVEL_LABELS[r.label] ?? r.label })) };
}

export function eventMetrics(range: Range = {}) {
  const conds = [
    range.from ? gte(events.startsAt, range.from) : undefined,
    range.to ? lte(events.startsAt, range.to) : undefined,
  ].filter(Boolean);
  const where = conds.length ? and(...conds) : undefined;

  const [totals] = db
    .select({
      events: sql<number>`count(*)`,
      turnedUp: sql<number>`coalesce(sum(${events.turnedUp}), 0)`,
      participated: sql<number>`coalesce(sum(${events.participated}), 0)`,
    })
    .from(events)
    .where(where)
    .all();

  const recent = db.select().from(events).where(where).orderBy(desc(events.startsAt)).limit(200).all();
  const participationRate = totals.turnedUp > 0 ? totals.participated / totals.turnedUp : null;
  return { ...totals, participationRate, recent };
}

export function mediaMetrics() {
  const pages = db.select().from(mediaPages).orderBy(desc(mediaPages.followers)).all();
  const followers = pages.reduce((n, p) => n + p.followers, 0);
  const lastRecorded = pages.reduce<Date | null>(
    (m, p) => (!m || p.recordedAt > m ? p.recordedAt : m),
    null,
  );
  return { pages, followers, lastRecorded };
}

export function lastImport(dataset: string) {
  const ok = db
    .select()
    .from(importRuns)
    .where(and(eq(importRuns.dataset, dataset), sql`${importRuns.status} != 'failed'`))
    .orderBy(desc(importRuns.startedAt))
    .limit(1)
    .get();
  const attempt = db
    .select()
    .from(importRuns)
    .where(eq(importRuns.dataset, dataset))
    .orderBy(desc(importRuns.startedAt))
    .limit(1)
    .get();
  return { lastSuccess: ok?.finishedAt ?? null, lastAttempt: attempt?.startedAt ?? null, attempt };
}

export function datasetOverview() {
  const m = memberMetrics();
  const e = eventMetrics();
  const md = mediaMetrics();
  return [
    { key: "members", label: "Members", records: m.total, ...lastImport("members") },
    { key: "events", label: "Events", records: e.events, ...lastImport("events") },
    { key: "media", label: "Media pages", records: md.pages.length, ...lastImport("media") },
  ];
}

export function eventsByMonth(range: Range = {}) {
  const conds = [
    range.from ? gte(events.startsAt, range.from) : undefined,
    range.to ? lte(events.startsAt, range.to) : undefined,
  ].filter(Boolean);
  const month = sql<string>`strftime('%Y-%m', ${events.startsAt}, 'unixepoch')`;
  return db
    .select({
      month,
      events: sql<number>`count(*)`,
      turnedUp: sql<number>`coalesce(sum(${events.turnedUp}), 0)`,
      participated: sql<number>`coalesce(sum(${events.participated}), 0)`,
    })
    .from(events)
    .where(conds.length ? and(...conds) : undefined)
    .groupBy(month)
    .orderBy(month)
    .all();
}
