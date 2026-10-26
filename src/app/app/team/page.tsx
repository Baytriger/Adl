import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { ROLES } from "@/server/db/schema";
import { requireUser } from "@/server/session";
import { addUser, updateUser } from "@/server/actions";
import { ActionForm, Field } from "@/components/action-form";
import { ResetPassword } from "@/components/reset-password";
import { PageHeader, Panel, fmtDateTime, inputClass } from "@/components/ui";

export const metadata: Metadata = { title: "Team and permissions" };

export default async function TeamPage() {
  const me = await requireUser("admin");
  const people = await db.select().from(schema.users).orderBy(asc(schema.users.email));

  return (
    <>
      <PageHeader
        title="Team and permissions"
        description="Only people with an account here can sign in. Viewers can read, editors can also change data, admins can also manage people."
      />
      <div className="overflow-x-auto rounded-ui border border-border bg-surface">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">People with access</caption>
          <thead className="border-b border-border bg-surface-2 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-medium">Person</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Last sign-in</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Role and access</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {people.map((p) => {
              const self = p.email === me.email;
              return (
                <tr key={p.id}>
                  <td className="max-w-[260px] px-4 py-3">
                    <p className="truncate font-medium">{p.name ?? p.email}{self && <span className="ml-2 text-xs text-muted">(you)</span>}</p>
                    {p.name && <p className="truncate text-xs text-muted">{p.email}</p>}
                  </td>
                  <td className="tnum px-4 py-3">{fmtDateTime(p.lastLogin)}</td>
                  <td className="px-4 py-3">
                    <form action={updateUser} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="id" value={p.id} />
                      <select name="role" defaultValue={p.role} disabled={self} aria-label={`Role for ${p.email}`} className={`${inputClass} h-9 w-32 capitalize`}>
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <select name="active" defaultValue={String(p.active)} disabled={self} aria-label={`Access for ${p.email}`} className={`${inputClass} h-9 w-32`}>
                        <option value="true">Active</option>
                        <option value="false">Disabled</option>
                      </select>
                      {self ? <span className="text-xs text-muted">You can&apos;t change your own access.</span> : <button type="submit" className="h-9 rounded-ui border border-border-strong px-3 text-sm hover:bg-surface-2">Save</button>}
                    </form>
                    {!self && <ResetPassword id={p.id} email={p.email} />}
                    {p.mustChange && <p className="mt-1.5 text-xs text-muted">Hasn&apos;t replaced the temporary password yet.</p>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Panel title="Create an account" className="mt-8">
        <ActionForm action={addUser} submitLabel="Create account" pendingLabel="Creating…">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" name="email" type="email" required hint="They sign in with this address." />
            <Field label="Name" name="name" hint="Optional." />
            <Field label="Role" name="role" required>
              <select id="f-role" name="role" defaultValue="viewer" className={`${inputClass} capitalize`}>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Temporary password" name="password" hint="Optional. Leave blank and ADL makes one for you. They must change it at first sign-in." />
          </div>
        </ActionForm>
      </Panel>
    </>
  );
}
