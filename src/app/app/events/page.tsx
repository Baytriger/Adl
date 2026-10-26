import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/server/session";
import { hasRole } from "@/server/users";
import { eventMetrics } from "@/server/metrics";
import { addEvent, deleteEvent } from "@/server/actions";
import { ActionForm, Field } from "@/components/action-form";
import { EmptyState, PageHeader, Panel, Stat, fmtDate, inputClass } from "@/components/ui";
import { buttonClass } from "@/components/button-styles";

export const metadata: Metadata = { title: "Events" };

const isDate = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const from = isDate(sp.from) ? new Date(`${sp.from}T00:00:00Z`) : undefined;
  const to = isDate(sp.to) ? new Date(`${sp.to}T23:59:59Z`) : undefined;
  const m = await eventMetrics({ from, to });
  const canEdit = hasRole(user.role, "editor");
  const filtered = Boolean(from || to);

  return (
    <>
      <PageHeader
        title="Events"
        description="How many people turned up to each event, and how many of them took part."
        actions={<a href="/api/export/events" download className={buttonClass("secondary")}>Export CSV</a>}
      />

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3" aria-label="Filter events by date">
        <div>
          <label htmlFor="from" className="mb-1 block text-sm font-medium">From</label>
          <input id="from" name="from" type="date" defaultValue={sp.from} className={`${inputClass} w-44`} />
        </div>
        <div>
          <label htmlFor="to" className="mb-1 block text-sm font-medium">To</label>
          <input id="to" name="to" type="date" defaultValue={sp.to} className={`${inputClass} w-44`} />
        </div>
        <button type="submit" className={buttonClass("primary")}>Apply</button>
        {filtered && <Link href="/app/events" className={buttonClass("secondary")}>Clear</Link>}
      </form>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Events" value={m.events.toLocaleString("en")} />
        <Stat label="Turned up" value={m.turnedUp.toLocaleString("en")} />
        <Stat
          label="Participated"
          value={m.participated.toLocaleString("en")}
          note={m.participationRate == null ? undefined : `${Math.round(m.participationRate * 100)}% of those who turned up`}
        />
      </div>

      {m.recent.length === 0 ? (
        <EmptyState
          title={filtered ? "No events in that date range" : "No events yet"}
          body={filtered ? "Widen the dates or clear the filter." : canEdit ? "Add an event below or import a CSV from Data sources." : "An editor or admin needs to add events before they appear here."}
        />
      ) : (
        <div className="overflow-x-auto rounded-ui border border-border bg-surface">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">Events</caption>
            <thead className="border-b border-border bg-surface-2 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">Event</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Date</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">Turned up</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">Participated</th>
                {canEdit && <th scope="col" className="px-4 py-2.5 text-right font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {m.recent.map((e) => (
                <tr key={e.id} className="hover:bg-surface-2/60">
                  <td className="max-w-[260px] px-4 py-3">
                    <p className="truncate font-medium">{e.title}</p>
                    {e.region && <p className="truncate text-xs text-muted">{e.region}</p>}
                  </td>
                  <td className="tnum px-4 py-3">{fmtDate(e.startsAt)}</td>
                  <td className="tnum px-4 py-3 text-right">{e.turnedUp.toLocaleString("en")}</td>
                  <td className="tnum px-4 py-3 text-right">{e.participated.toLocaleString("en")}</td>
                  {canEdit && (
                    <td className="px-4 py-3 text-right">
                      <form action={deleteEvent}>
                        <input type="hidden" name="id" value={e.id} />
                        <button type="submit" className="text-sm text-danger hover:underline" aria-label={`Delete ${e.title}`}>Delete</button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {m.events > m.recent.length && (
        <p className="mt-2 text-xs text-muted">Showing the latest {m.recent.length} of {m.events}. Totals above include all of them.</p>
      )}

      {canEdit && (
        <Panel title="Add an event" className="mt-8">
          <ActionForm action={addEvent} submitLabel="Add event" pendingLabel="Adding…">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Title" name="title" required />
              <Field label="Date" name="starts_at" type="date" required />
              <Field label="Region" name="region" hint="Optional." />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Turned up" name="turned_up" type="number" required />
                <Field label="Participated" name="participated" type="number" required />
              </div>
            </div>
          </ActionForm>
        </Panel>
      )}
    </>
  );
}
