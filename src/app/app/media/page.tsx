import type { Metadata } from "next";
import { requireUser } from "@/server/session";
import { hasRole } from "@/server/users";
import { freshness, mediaMetrics } from "@/server/metrics";
import { deleteMediaPage, saveMediaPage } from "@/server/actions";
import { ActionForm, Field } from "@/components/action-form";
import { EmptyState, FreshnessBadge, PageHeader, Panel, Stat, fmtDate } from "@/components/ui";
import { buttonClass } from "@/components/button-styles";

export const metadata: Metadata = { title: "Media pages" };

export default async function MediaPage() {
  const user = await requireUser();
  const m = await mediaMetrics();
  const canEdit = hasRole(user.role, "editor");
  const totalPosts = m.pages.reduce((n, p) => n + p.posts, 0);

  return (
    <>
      <PageHeader
        title="Media pages"
        description="Followers and post counts for each page. Figures are entered or imported by people, and each row shows the date it was recorded."
        actions={<a href="/api/export/media" download className={buttonClass("secondary")}>Export CSV</a>}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Pages" value={String(m.pages.length)} />
        <Stat label="Total followers" value={m.followers.toLocaleString("en")} />
        <Stat label="Total posts" value={totalPosts.toLocaleString("en")} note={m.lastRecorded ? `Latest figures from ${fmtDate(m.lastRecorded)}` : undefined} />
      </div>

      {m.pages.length === 0 ? (
        <EmptyState title="No media pages yet" body={canEdit ? "Add a page below or import a CSV from Data sources." : "An editor or admin needs to add media pages before they appear here."} />
      ) : (
        <div className="overflow-x-auto rounded-ui border border-border bg-surface">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">Media pages</caption>
            <thead className="border-b border-border bg-surface-2 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">Page</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">Followers</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">Posts</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Recorded</th>
                {canEdit && <th scope="col" className="px-4 py-2.5 text-right font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {m.pages.map((p) => (
                <tr key={p.id} className="hover:bg-surface-2/60">
                  <td className="max-w-[260px] px-4 py-3">
                    <p className="truncate font-medium">{p.handle}</p>
                    <p className="truncate text-xs capitalize text-muted">
                      {p.url ? <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{p.platform}</a> : p.platform}
                    </p>
                  </td>
                  <td className="tnum px-4 py-3 text-right">{p.followers.toLocaleString("en")}</td>
                  <td className="tnum px-4 py-3 text-right">{p.posts.toLocaleString("en")}</td>
                  <td className="px-4 py-3">
                    <span className="tnum mr-2">{fmtDate(p.recordedAt)}</span>
                    <FreshnessBadge state={freshness(p.recordedAt)} />
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3 text-right">
                      <form action={deleteMediaPage}>
                        <input type="hidden" name="id" value={p.id} />
                        <button type="submit" className="text-sm text-danger hover:underline" aria-label={`Delete ${p.handle}`}>Delete</button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canEdit && (
        <Panel title="Add or update a page" className="mt-8">
          <p className="mb-4 text-sm text-muted">Saving a platform and handle that already exists updates its numbers and the recorded date.</p>
          <ActionForm action={saveMediaPage} submitLabel="Save page" pendingLabel="Saving…">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Platform" name="platform" required placeholder="e.g. instagram" />
              <Field label="Handle" name="handle" required placeholder="e.g. @adl" />
              <Field label="Page URL" name="url" type="url" hint="Optional." />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Followers" name="followers" type="number" required />
                <Field label="Posts" name="posts" type="number" required />
              </div>
            </div>
          </ActionForm>
        </Panel>
      )}
    </>
  );
}
