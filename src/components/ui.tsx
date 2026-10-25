import type { Freshness } from "@/server/metrics";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-ui border border-border bg-surface ${className}`}>
      {title && <h2 className="border-b border-border px-4 py-3 text-sm font-medium">{title}</h2>}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-ui border border-border bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="tnum mt-2 truncate text-2xl font-semibold tracking-tight">{value}</p>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
    </div>
  );
}

const FRESH: Record<Freshness, { label: string; cls: string }> = {
  current: { label: "Current", cls: "bg-success-soft text-success" },
  stale: { label: "Stale", cls: "bg-warning-soft text-warning" },
  empty: { label: "No data", cls: "bg-surface-2 text-muted" },
};

export function FreshnessBadge({ state }: { state: Freshness }) {
  const f = FRESH[state];
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${f.cls}`}>{f.label}</span>;
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-ui border border-dashed border-border-strong px-6 py-10 text-center">
      <p className="font-medium">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted">{body}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

/** Horizontal bars with the numbers printed beside them, so nothing depends on colour or hover. */
export function BarList({
  items,
  unit = "",
  empty = "No data yet.",
}: {
  items: { label: string; value: number }[];
  unit?: string;
  empty?: string;
}) {
  if (!items.length) return <p className="text-sm text-muted">{empty}</p>;
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="space-y-3">
      {items.map((i) => (
        <li key={i.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">{i.label}</span>
            <span className="tnum shrink-0 font-medium">
              {i.value.toLocaleString("en")}
              {i.value === 1 ? unit.replace(/s$/, "") : unit}
            </span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-surface-2" aria-hidden="true">
            <div
              className="h-2 rounded-full bg-accent"
              style={{ width: `${Math.max((i.value / max) * 100, 2)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Notice({ kind, children }: { kind: "success" | "error" | "info"; children: React.ReactNode }) {
  const cls =
    kind === "success"
      ? "border-success/40 bg-success-soft"
      : kind === "error"
        ? "border-danger/40 bg-danger-soft"
        : "border-border bg-surface-2";
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`mb-4 rounded-ui border p-3 text-sm ${cls}`}>
      {children}
    </div>
  );
}

export const inputClass =
  "h-10 w-full rounded-ui border border-border-strong bg-surface px-3 text-sm placeholder:text-muted";

export function fmtDate(d: Date | null | undefined) {
  return d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Never";
}
export function fmtDateTime(d: Date | null | undefined) {
  return d
    ? d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "Never";
}
