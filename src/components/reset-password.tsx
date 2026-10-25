"use client";

import { useActionState } from "react";
import { resetPassword } from "@/server/actions";

/** Admin: give someone a new temporary password. It is shown once, here. */
export function ResetPassword({ id, email }: { id: string; email: string }) {
  const [state, action, pending] = useActionState(resetPassword, null);
  return (
    <form action={action} className="mt-2" onSubmit={(e) => {
      if (!window.confirm(`Reset the password for ${email}? Their current password will stop working.`)) e.preventDefault();
    }}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={pending} className="text-xs font-medium text-accent hover:underline disabled:opacity-60">
        {pending ? "Resetting…" : "Reset password"}
      </button>
      <div aria-live="polite">
        {state?.error && <p className="mt-1 text-xs text-danger">{state.error}</p>}
        {state?.ok && (
          <div className="mt-1 rounded-ui border border-border bg-surface-2 p-2 text-xs">
            <p>{state.ok}</p>
            {state.details?.map((d) => <code key={d} className="mt-1 block select-all break-all font-mono text-sm">{d}</code>)}
          </div>
        )}
      </div>
    </form>
  );
}
