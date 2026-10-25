"use client";

import { useActionState } from "react";
import { createFirstAdmin, signInWithPassword } from "@/server/actions";
import { SubmitButton } from "./submit-button";
import { useKeepFields } from "./use-keep-fields";

const input = "h-11 w-full rounded-ui border border-border-strong bg-surface px-3 text-sm placeholder:text-muted";

function Error({ message }: { message?: string }) {
  return (
    <div aria-live="polite">
      {message && (
        <div role="alert" className="mb-4 rounded-ui border border-danger/40 bg-danger-soft p-3 text-sm text-danger">
          {message}
        </div>
      )}
    </div>
  );
}

export function SignInForm() {
  const [state, action] = useActionState(signInWithPassword, null);
  const { ref, onSubmitCapture } = useKeepFields(state);
  return (
    <form ref={ref} action={action} onSubmitCapture={onSubmitCapture} className="mt-6 space-y-4">
      <Error message={state?.error} />
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium">Email</label>
        <input id="email" name="email" type="email" required autoComplete="username" autoFocus className={input} />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium">Password</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className={input} />
      </div>
      <SubmitButton pendingLabel="Signing in…" className="w-full justify-center">Sign in</SubmitButton>
      <p className="text-xs text-muted">Forgot your password? Ask an ADL admin to reset it for you.</p>
    </form>
  );
}

/** Shown only until the first account exists. */
export function SetupForm() {
  const [state, action] = useActionState(createFirstAdmin, null);
  const { ref, onSubmitCapture } = useKeepFields(state);
  return (
    <form ref={ref} action={action} onSubmitCapture={onSubmitCapture} className="mt-6 space-y-4">
      <Error message={state?.error} />
      <div>
        <label htmlFor="s-email" className="mb-1 block text-sm font-medium">Admin email</label>
        <input id="s-email" name="email" type="email" required autoComplete="username" className={input} />
        <p className="mt-1 text-xs text-muted">Must be one of the emails in this server&apos;s admin list.</p>
      </div>
      <div>
        <label htmlFor="s-name" className="mb-1 block text-sm font-medium">Your name</label>
        <input id="s-name" name="name" autoComplete="name" className={input} />
      </div>
      <div>
        <label htmlFor="s-password" className="mb-1 block text-sm font-medium">Password</label>
        <input id="s-password" name="password" type="password" required minLength={10} autoComplete="new-password" className={input} />
        <p className="mt-1 text-xs text-muted">At least 10 characters.</p>
      </div>
      <div>
        <label htmlFor="s-confirm" className="mb-1 block text-sm font-medium">Confirm password</label>
        <input id="s-confirm" name="confirm" type="password" required minLength={10} autoComplete="new-password" className={input} />
      </div>
      <SubmitButton pendingLabel="Creating…" className="w-full justify-center">Create admin account</SubmitButton>
    </form>
  );
}
