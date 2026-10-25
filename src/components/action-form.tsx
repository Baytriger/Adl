"use client";

import { useActionState, useEffect } from "react";
import type { FormState } from "@/server/actions";
import { SubmitButton } from "./submit-button";
import { Notice } from "./ui";
import { useKeepFields } from "./use-keep-fields";

/** Form wrapper that shows success/error from a server action and resets after success. */
export function ActionForm({
  action,
  submitLabel,
  pendingLabel,
  children,
  className = "",
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  submitLabel: string;
  pendingLabel?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const { ref, onSubmitCapture } = useKeepFields(state);

  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state, ref]);

  return (
    <form ref={ref} action={formAction} onSubmitCapture={onSubmitCapture} className={className}>
      {state?.error && (
        <Notice kind="error">
          <p className="font-medium">{state.error}</p>
          {state.details && (
            <ul className="mt-2 list-disc space-y-0.5 pl-5">
              {state.details.map((d) => <li key={d}>{d}</li>)}
            </ul>
          )}
        </Notice>
      )}
      {state?.ok && (
        <Notice kind="success">
          <p>{state.ok}</p>
          {state.details && (
            <ul className="mt-2 list-disc space-y-0.5 pl-5">
              {state.details.map((d) => <li key={d}>{d}</li>)}
            </ul>
          )}
        </Notice>
      )}
      {children}
      <div className="mt-4">
        <SubmitButton pendingLabel={pendingLabel}>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}

export function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  hint,
  children,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  children?: React.ReactNode;
}) {
  const id = `f-${name}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      {children ?? (
        <input
          id={id}
          name={name}
          type={type}
          required={required}
          placeholder={placeholder}
          min={type === "number" ? 0 : undefined}
          className="h-10 w-full rounded-ui border border-border-strong bg-surface px-3 text-sm placeholder:text-muted"
        />
      )}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
