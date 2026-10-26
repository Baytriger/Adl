import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/server/session";
import { eventMetrics, eventsByMonth, mediaMetrics, memberMetrics } from "@/server/metrics";
import { BarList, EmptyState, PageHeader, Panel, Stat, inputClass } from "@/components/ui";
import { buttonClass } from "@/components/button-styles";

export const metadata: Metadata = { title: "Reports" };

const TABS = [
  { key: "members", label: "Members" },
  { key: "events", label: "Event turnout" },
  { key: "media", label: "Media reach" },
] as const;
type Tab = (typeof TABS)[number]["key"];

const isDate = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ report?: string; from?: string; to?: string }>;
}) {
  await requireUser();
  const sp = await searchParams;
  const tab: Tab = TABS.some((t) => t.key === sp.report) ? (sp.report as Tab) : "members";
  const from = isDate(sp.from) ? new Date(`${sp.from}T00:00:00Z`) : undefined;
  const to = isDate(sp.to) ? new Date(`${sp.to}T23:59:59Z`) : undefined;

  return (
    <>
      <PageHeader
        title="Reports"
        description="Each report reads from the same records as the rest of the workspace, so totals match everywhere."
        actions={<a href={`/api/export/${tab}`} download className={buttonClass("secondary")}>Export {tab} CSV</a>}
      />

      <nav aria-label="Report type" className="mb-6 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/app/reports?report=${t.key}`}
            aria-current={t.key === tab ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2.5 text-sm transition-colors ${
              t.key === tab ? "border-accent font-medium text-text" : "border-transparent text-muted hover:text-text"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "members" && <MembersReport />}
      {tab === "events" && <EventsReport from={from} to={to} fromRaw={sp.from} toRaw={sp.to} />}
      {tab === "media" && <MediaReport />}
    </>
  );
}

async function MembersReport() {
  const m = await memberMetrics();
  if (m.total === 0) return <EmptyState title="No members to report on" body="Import or add members first." />;
  return (
    <div className="space-y-6">
      <Stat label="Active members" value={m.total.toLocaleString("en")} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="By region"><BarList items={m.byRegion} unit=" members" /></Panel>
        <Panel title="By professional level"><BarList items={m.byLevel} unit=" members" /></Panel>
      </div>
    </div>
  );
}

async function EventsReport({ from, to, fromRaw, toRaw }: { from?: Date; to?: Date; fromRaw?: string; toRaw?: string }) {
  const t = await eventMetrics({ from, to });
  const months = await eventsByMonth({ from, to });
  return (
    <div className="space-y-6">
      <form method="get" className="flex flex-wrap items-end gap-3" aria-label="Filter by date">
        <input type="hidden" name="report" value="events" />
        <div>
          <label htmlFor="r-from" className="mb-1 block text-sm font-medium">From</label>
          <input id="r-from" name="from" type="date" defaultValue={fromRaw} className={`${inputClass} w-44`} />
        </div>
        <div>
          <label htmlFor="r-to" className="mb-1 block text-sm font-medium">To</label>
          <input id="r-to" name="to" type="date" defaultValue={toRaw} className={`${inputClass} w-44`} />
        </div>
        <button type="submit" className={buttonClass("primary")}>Apply</button>
        {(from || to) && <Link href="/app/reports?report=events" className={buttonClass("secondary")}>Clear</Link>}
      </form>
      {t.events === 0 ? (
        <EmptyState title="No events in this range" body="Widen the dates or add events." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Events" value={t.events.toLocaleString("en")} />
            <Stat label="Turned up" value={t.turnedUp.toLocaleString("en")} />
            <Stat label="Participation rate" value={t.participationRate == null ? "–" : `${Math.round(t.participationRate * 100)}%`} note="Participated ÷ turned up" />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="People who turned up, by month"><BarList items={months.map((m) => ({ label: m.month, value: m.turnedUp }))} unit=" people" /></Panel>
            <Panel title="People who participated, by month"><BarList items={months.map((m) => ({ label: m.month, value: m.participated }))} unit=" people" /></Panel>
          </div>
        </>
      )}
    </div>
  );
}

async function MediaReport() {
  const m = await mediaMetrics();
  if (!m.pages.length) return <EmptyState title="No media pages to report on" body="Add or import media pages first." />;
  return (
    <div className="space-y-6">
      <Stat label="Total followers" value={m.followers.toLocaleString("en")} />
      <Panel title="Followers by page">
        <BarList items={m.pages.map((p) => ({ label: `${p.handle} (${p.platform})`, value: p.followers }))} unit=" followers" />
      </Panel>
    </div>
  );
}
