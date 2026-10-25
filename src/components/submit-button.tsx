"use client";

import { useFormStatus } from "react-dom";
import { buttonClass, type ButtonVariant } from "./button-styles";

/** Submit button that blocks double submits and announces progress to assistive tech. */
export function SubmitButton({
  children,
  pendingLabel = "Working…",
  variant = "primary",
  className = "",
  disabled,
  name,
  value,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: ButtonVariant;
  className?: string;
  disabled?: boolean;
  name?: string;
  value?: string;
}) {
  const { pending: formPending, data } = useFormStatus();
  // With several submit buttons, only the one that was pressed shows its progress label.
  const pending = formPending && (!name || data?.get(name) === value);
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={formPending || disabled}
      aria-disabled={formPending || disabled}
      className={`${buttonClass(variant)} ${className}`}
    >
      {pending ? <span role="status">{pendingLabel}</span> : children}
    </button>
  );
}
