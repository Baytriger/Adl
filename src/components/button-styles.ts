export type ButtonVariant = "primary" | "secondary" | "danger";

export const buttonClass = (variant: ButtonVariant = "primary") =>
  [
    "inline-flex h-10 items-center gap-2 rounded-ui px-4 text-sm font-medium transition-colors",
    "disabled:cursor-not-allowed disabled:opacity-50",
    variant === "primary" && "bg-accent text-accent-contrast hover:bg-accent-hover",
    variant === "secondary" && "border border-border-strong bg-surface text-text hover:bg-surface-2",
    variant === "danger" && "bg-danger text-accent-contrast hover:opacity-90",
  ]
    .filter(Boolean)
    .join(" ");
