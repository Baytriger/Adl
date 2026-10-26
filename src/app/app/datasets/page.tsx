import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { requireUser } from "@/server/session";
import { hasRole } from "@/server/users";
import { datasetOverview, freshness } from "@/server/metrics";
import { ImportForm } from "@/components/import-form";
import { FreshnessBadge, PageHeader, Panel, fmtDateTime } from "@/components/ui";

export const metadata: Metadata = { title: "Data sources" };

export default async function DatasetsPage() {
  const user = await requireUser();
  const canEdit = hasRole(user.role, "editor");
  const sets = await datasetOverview();
  const runs = await db.select().from(schema.importRuns).orderBy(desc(schema.importRuns.startedAt)).limit(10);

  return (
    <>
      <PageHeader
        title="Data sources"
        description="Where each dataset comes from, when it last loaded successfully, and a record of recent imports."
      />

      <div className="overflow-x-auto rounded-ui border border-border bg-surface">
        <table className="w-full min-w-[680px] text-left text-sm">
          <caption className="sr-only">Datasets and their import status</caption>
          <thead className="border-b border-border bg-surface-2 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-medium">Dataset</th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">Records</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Last successful import</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Last attempt</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sets.map((s) => (
              <tr key={s.key}>
                <td className="px-4 py-3 font-medium">{s.label}</td>
                <td className="tnum px-4 py-3 text-right">{s.records.toLocaleString("en")}</td>
                <td className="tnum px-4 py-3">{fmtDateTime(s.lastSuccess)}</td>
                <td className="tnum px-4 py-3">{fmtDateTime(s.lastAttempt)}</td>
                <td className="px-4 py-3">
                  {s.attempt?.status === "failed" ? (
                    <span className="rounded bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger">Last import failed</span>
                  ) : (
                    <FreshnessBadge state={freshness(s.lastSuccess)} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canEdit ? (
        <Panel title="Import a file" className="mt-8">
          <ImportForm />
        </Panel>
      ) : (
        <p className="mt-6 text-sm text-muted">Your role can view data but not import it. Ask an editor or admin.</p>
      )}

      <Panel title="Recent imports" className="mt-6">
        {runs.length === 0 ? (
          <p className="text-sm text-muted">No imports yet.</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {runs.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                <span><span className="font-medium capitalize">{r.dataset}</span> <span className="text-muted">· {r.byEmail ?? "unknown"}</span></span>
                <span className="tnum text-muted">
                  {r.rowsOk} imported, {r.rowsBad} rejected · {r.status} · {fmtDateTime(r.startedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}

