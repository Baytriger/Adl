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
export async function memberMetrics() {
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(members)
    .where(eq(members.active, true));
  const byRegion = await db
    .select({ label: members.region, value: sql<number>`count(*)::int` })
    .from(members)
    .where(eq(members.active, true))
    .groupBy(members.region)
    .orderBy(desc(sql`count(*)`));
  const byLevel = await db
    .select({ label: members.level, value: sql<number>`count(*)::int` })
    .from(members)
    .where(eq(members.active, true))
    .groupBy(members.level)
    .orderBy(desc(sql`count(*)`));
  return { total, byRegion, byLevel: byLevel.map((r) => ({ ...r, label: LEVEL_LABELS[r.label] ?? r.label })) };
}

export async function eventMetrics(range: Range = {}) {
  const conds = [
    range.from ? gte(events.startsAt, range.from) : undefined,
    range.to ? lte(events.startsAt, range.to) : undefined,
  ].filter(Boolean);
  const where = conds.length ? and(...conds) : undefined;

  const [totals] = await db
    .select({
      events: sql<number>`count(*)::int`,
      turnedUp: sql<number>`coalesce(sum(${events.turnedUp}), 0)::int`,
      participated: sql<number>`coalesce(sum(${events.participated}), 0)::int`,
    })
    .from(events)
    .where(where);

  const recent = await db.select().from(events).where(where).orderBy(desc(events.startsAt)).limit(200);
  const participationRate = totals.turnedUp > 0 ? totals.participated / totals.turnedUp : null;
  return { ...totals, participationRate, recent };
}

export async function mediaMetrics() {
  const pages = await db.select().from(mediaPages).orderBy(desc(mediaPages.followers));
  const followers = pages.reduce((n, p) => n + p.followers, 0);
  const lastRecorded = pages.reduce<Date | null>(
    (m, p) => (!m || p.recordedAt > m ? p.recordedAt : m),
    null,
  );
  return { pages, followers, lastRecorded };
}

export async function lastImport(dataset: string) {
  const [ok] = await db
    .select()
    .from(importRuns)
    .where(and(eq(importRuns.dataset, dataset), sql`${importRuns.status} != 'failed'`))
    .orderBy(desc(importRuns.startedAt))
    .limit(1);
  const [attempt] = await db
    .select()
    .from(importRuns)
    .where(eq(importRuns.dataset, dataset))
    .orderBy(desc(importRuns.startedAt))
    .limit(1);
  return { lastSuccess: ok?.finishedAt ?? null, lastAttempt: attempt?.startedAt ?? null, attempt };
}

export async function datasetOverview() {
  const [m, e, md, li] = await Promise.all([
    memberMetrics(),
    eventMetrics(),
    mediaMetrics(),
    Promise.all(["members", "events", "media"].map((k) => lastImport(k))),
  ]);
  return [
    { key: "members", label: "Members", records: m.total, ...li[0] },
    { key: "events", label: "Events", records: e.events, ...li[1] },
    { key: "media", label: "Media pages", records: md.pages.length, ...li[2] },
  ];
}

export async function eventsByMonth(range: Range = {}) {
  const conds = [
    range.from ? gte(events.startsAt, range.from) : undefined,
    range.to ? lte(events.startsAt, range.to) : undefined,
  ].filter(Boolean);
  const month = sql<string>`to_char(${events.startsAt} at time zone 'UTC', 'YYYY-MM')`;
  return await db
    .select({
      month,
      events: sql<number>`count(*)::int`,
      turnedUp: sql<number>`coalesce(sum(${events.turnedUp}), 0)::int`,
      participated: sql<number>`coalesce(sum(${events.participated}), 0)::int`,
    })
    .from(events)
    .where(conds.length ? and(...conds) : undefined)
    .groupBy(month)
    .orderBy(month);
}
