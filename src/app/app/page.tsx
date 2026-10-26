import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/server/session";
import { datasetOverview, eventMetrics, freshness, mediaMetrics, memberMetrics } from "@/server/metrics";
import { BarList, EmptyState, FreshnessBadge, PageHeader, Panel, Stat, fmtDate } from "@/components/ui";
import { buttonClass } from "@/components/button-styles";

export const metadata: Metadata = { title: "Overview" };

const pct = (n: number | null) => (n == null ? "–" : `${Math.round(n * 100)}%`);
const num = (n: number) => n.toLocaleString("en");

export default async function Overview() {
  await requireUser();
  const m = await memberMetrics();
  const e = await eventMetrics();
  const media = await mediaMetrics();
  const sets = await datasetOverview();
  const hasAnything = m.total + e.events + media.pages.length > 0;

  return (
    <>
      <PageHeader
        title="Company overview"
        description="Headline numbers from your member, event and media records. Every figure is calculated from the stored records."
      />

      {!hasAnything && (
        <div className="mb-6">
          <EmptyState
            title="No data yet"
            body="Import a CSV for members, events or media pages to see numbers here. Nothing on this page is sample data."
            action={<Link href="/app/datasets" className={buttonClass("primary")}>Import data</Link>}
          />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active members" value={num(m.total)} />
        <Stat label="Events recorded" value={num(e.events)} note={`${num(e.turnedUp)} turned up in total`} />
        <Stat
          label="Participation rate"
          value={pct(e.participationRate)}
          note="Participated ÷ turned up, all events"
        />
        <Stat label="Media followers" value={num(media.followers)} note={`${media.pages.length} page(s)`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Members by region">
          <BarList items={m.byRegion.slice(0, 8)} unit=" members" empty="No members recorded yet." />
        </Panel>
        <Panel title="Members by professional level">
          <BarList items={m.byLevel} unit=" members" empty="No members recorded yet." />
        </Panel>
      </div>

      <Panel title="Data freshness" className="mt-6">
        <ul className="divide-y divide-border">
          {sets.map((s) => (
            <li key={s.key} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium">{s.label}</p>
                <p className="text-xs text-muted">
                  <span className="tnum">{num(s.records)}</span> records · last import {fmtDate(s.lastSuccess)}
                </p>
              </div>
              <FreshnessBadge state={freshness(s.lastSuccess)} />
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">
          Data counts as stale 30 days after the last successful import. Records added by hand don&apos;t change this date.
        </p>
      </Panel>
    </>
  );
}
