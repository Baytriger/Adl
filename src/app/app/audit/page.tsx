import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { requireUser } from "@/server/session";
import { EmptyState, PageHeader, fmtDateTime } from "@/components/ui";

export const metadata: Metadata = { title: "Audit log" };

export default async function AuditPage() {
  await requireUser("admin");
  const rows = await db.select().from(schema.auditLog).orderBy(desc(schema.auditLog.at)).limit(200);
  return (
    <>
      <PageHeader title="Audit log" description="The 200 most recent sign-ins, imports, exports and changes to data or access." />
      {rows.length === 0 ? (
        <EmptyState title="Nothing logged yet" body="Activity appears here as people use the workspace." />
      ) : (
        <div className="overflow-x-auto rounded-ui border border-border bg-surface">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">Audit log</caption>
            <thead className="border-b border-border bg-surface-2 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">When</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Who</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Action</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="tnum whitespace-nowrap px-4 py-2.5">{fmtDateTime(r.at)}</td>
                  <td className="max-w-[200px] truncate px-4 py-2.5">{r.actor}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{r.action}</td>
                  <td className="max-w-[260px] truncate px-4 py-2.5 text-muted">{[r.target, r.detail].filter(Boolean).join(" · ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
