import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { LEVELS, LEVEL_LABELS } from "@/server/db/schema";
import { requireUser } from "@/server/session";
import { hasRole } from "@/server/users";
import { addMember, deleteMember } from "@/server/actions";
import { ActionForm, Field } from "@/components/action-form";
import { EmptyState, PageHeader, Panel, fmtDate, inputClass } from "@/components/ui";
import { buttonClass } from "@/components/button-styles";

export const metadata: Metadata = { title: "Members" };
const PAGE_SIZE = 25;

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; region?: string; level?: string; page?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const { members } = schema;

  const q = sp.q?.trim().slice(0, 100);
  const level = (LEVELS as readonly string[]).includes(sp.level ?? "") ? sp.level : undefined;
  const where = and(
    q ? or(like(members.fullName, `%${q}%`), like(members.email, `%${q}%`)) : undefined,
    sp.region ? eq(members.region, sp.region) : undefined,
    level ? eq(members.level, level as (typeof LEVELS)[number]) : undefined,
  );

  const [{ total }] = db.select({ total: sql<number>`count(*)` }).from(members).where(where).all();
  const rows = db.select().from(members).where(where).orderBy(desc(members.joinedAt)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE).all();
  const regions = db.selectDistinct({ r: members.region }).from(members).orderBy(members.region).all().map((r) => r.r);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canEdit = hasRole(user.role, "editor");

  const qs = (over: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const merged = { q, region: sp.region, level, page: undefined, ...over };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, String(v));
    const s = p.toString();
    return s ? `?${s}` : "";
  };

  return (
    <>
      <PageHeader
        title="Members"
        description="Everyone in the member records, with region and professional level."
        actions={<a href="/api/export/members" download className={buttonClass("secondary")}>Export CSV</a>}
      />

      <form method="get" className="mb-4 grid gap-3 sm:grid-cols-[1fr_180px_180px_auto]" role="search" aria-label="Filter members">
        <input name="q" defaultValue={q} placeholder="Search name or email" aria-label="Search name or email" className={inputClass} />
        <select name="region" defaultValue={sp.region ?? ""} aria-label="Region" className={inputClass}>
          <option value="">All regions</option>
          {regions.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select name="level" defaultValue={level ?? ""} aria-label="Professional level" className={inputClass}>
          <option value="">All levels</option>
          {LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
        </select>
        <div className="flex gap-2">
          <button type="submit" className={buttonClass("primary")}>Apply</button>
          {(q || sp.region || level) && <Link href="/app/members" className={buttonClass("secondary")}>Clear</Link>}
        </div>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          title={q || sp.region || level ? "No members match those filters" : "No members yet"}
          body={q || sp.region || level ? "Try removing a filter or searching for something else." : canEdit ? "Add a member below or import a CSV from Data sources." : "An editor or admin needs to add members before they appear here."}
        />
      ) : (
        <div className="overflow-x-auto rounded-ui border border-border bg-surface">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">Members</caption>
            <thead className="border-b border-border bg-surface-2 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">Name</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Region</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Level</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Joined</th>
                {canEdit && <th scope="col" className="px-4 py-2.5 text-right font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((m) => (
                <tr key={m.id} className="hover:bg-surface-2/60">
                  <td className="max-w-[240px] px-4 py-3">
                    <p className="truncate font-medium">{m.fullName}</p>
                    {m.email && <p className="truncate text-xs text-muted">{m.email}</p>}
                  </td>
                  <td className="px-4 py-3">{m.region}</td>
                  <td className="px-4 py-3">{LEVEL_LABELS[m.level]}</td>
                  <td className="tnum px-4 py-3">{fmtDate(m.joinedAt)}</td>
                  {canEdit && (
                    <td className="px-4 py-3 text-right">
                      <form action={deleteMember}>
                        <input type="hidden" name="id" value={m.id} />
                        <button type="submit" className="text-sm text-danger hover:underline" aria-label={`Delete ${m.fullName}`}>
                          Delete
                        </button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <nav aria-label="Pagination" className="mt-3 flex items-center justify-between text-sm text-muted">
        <p className="tnum">{total.toLocaleString("en")} member(s) · page {Math.min(page, pages)} of {pages}</p>
        <div className="flex gap-2">
          {page > 1 ? <Link className={buttonClass("secondary")} href={qs({ page: page - 1 })}>Previous</Link> : null}
          {page < pages ? <Link className={buttonClass("secondary")} href={qs({ page: page + 1 })}>Next</Link> : null}
        </div>
      </nav>

      {canEdit && (
        <Panel title="Add a member" className="mt-8">
          <ActionForm action={addMember} submitLabel="Add member" pendingLabel="Adding…">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" name="full_name" required />
              <Field label="Email" name="email" type="email" hint="Optional. Must be unique." />
              <Field label="Region" name="region" required placeholder="e.g. Lagos" />
              <Field label="Professional level" name="level" required>
                <select id="f-level" name="level" required defaultValue="" className={inputClass}>
                  <option value="" disabled>Select…</option>
                  {LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
                </select>
              </Field>
              <Field label="Joined on" name="joined_at" type="date" required />
            </div>
          </ActionForm>
        </Panel>
      )}
    </>
  );
}
