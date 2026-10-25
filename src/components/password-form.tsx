"use client";

import { changePassword } from "@/server/actions";
import { ActionForm, Field } from "./action-form";

const input = "h-10 w-full rounded-ui border border-border-strong bg-surface px-3 text-sm";

/** Change your own password. `forced` is the screen shown after signing in with a temporary one. */
export function PasswordForm({ forced = false }: { forced?: boolean }) {
  return (
    <ActionForm action={changePassword} submitLabel="Change password" pendingLabel="Changing…" className="space-y-4">
      {forced && <input type="hidden" name="forced" value="1" />}
      <Field label="Current password" name="current" required>
        <input id="f-current" name="current" type="password" required autoComplete="current-password" className={input} />
      </Field>
      <Field label="New password" name="next" required hint="At least 10 characters. A few random words works well.">
        <input id="f-next" name="next" type="password" required minLength={10} autoComplete="new-password" className={input} />
      </Field>
      <Field label="Confirm new password" name="confirm" required>
        <input id="f-confirm" name="confirm" type="password" required minLength={10} autoComplete="new-password" className={input} />
      </Field>
    </ActionForm>
  );
}
