"use client";

import { useActionState, useEffect, useRef } from "react";
import { importCsv } from "@/server/actions";
import { REQUIRED_COLUMNS } from "@/lib/import";
import { Field } from "./action-form";
import { SubmitButton } from "./submit-button";
import { Notice, inputClass } from "./ui";

const COLUMN_HELP: Record<string, string> = {
  members: "full_name, region, level (starting · exploring · learning · switching · entry · mid · professional · other), joined_at. Optional: email.",
  events: "title, starts_at, turned_up, participated. Optional: region.",
  media: "platform, handle, followers, posts, recorded_at. Optional: url.",
};

/** Two-step import: "Check file" reports problems and saves nothing; "Import" saves the valid rows. */
export function ImportForm() {
  const [state, action] = useActionState(importCsv, null);
  const ref = useRef<HTMLFormElement>(null);
  // React clears a form after every submit. Remember the choices so a check doesn't lose them.
  const chosen = useRef<{ dataset: string; file: File | null }>({ dataset: "", file: null });

  useEffect(() => {
    const form = ref.current;
    if (!form) return;
    const imported = state?.ok && state.checked === false;
    if (imported) {
      chosen.current = { dataset: "", file: null };
      form.reset();
      return;
    }
    const { dataset, file } = chosen.current;
    const select = form.elements.namedItem("dataset") as HTMLSelectElement | null;
    const input = form.elements.namedItem("file") as HTMLInputElement | null;
    if (select && dataset) select.value = dataset;
    if (input && file && input.files?.length === 0) {
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
    }
  }, [state]);

  const remember = (e: React.ChangeEvent<HTMLFormElement>) => {
    const t = e.target;
    if (t instanceof HTMLSelectElement && t.name === "dataset") chosen.current.dataset = t.value;
    if (t instanceof HTMLInputElement && t.name === "file") chosen.current.file = t.files?.[0] ?? null;
  };

  return (
    <form ref={ref} action={action} onChange={remember}>
      <div aria-live="polite">
        {state?.error && (
          <Notice kind="error">
            <p className="font-medium">{state.error}</p>
            {state.details && <ul className="mt-2 list-disc space-y-0.5 pl-5">{state.details.map((d) => <li key={d}>{d}</li>)}</ul>}
          </Notice>
        )}
        {state?.ok && (
          <Notice kind="success">
            <p className="font-medium">{state.ok}</p>
            {state.details && <ul className="mt-2 list-disc space-y-0.5 pl-5">{state.details.map((d) => <li key={d}>{d}</li>)}</ul>}
          </Notice>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Dataset" name="dataset" required>
          <select id="f-dataset" name="dataset" required defaultValue="" className={inputClass}>
            <option value="" disabled>Select…</option>
            <option value="members">Members</option>
            <option value="events">Events</option>
            <option value="media">Media pages</option>
          </select>
        </Field>
        <Field label="File" name="file" required hint="CSV or Excel (.xlsx), up to 5 MB and 20,000 rows. The first row must be column names; common names such as Full Name or Email Address are matched automatically.">
          <input id="f-file" name="file" type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required className="block w-full text-sm file:mr-3 file:h-10 file:rounded-ui file:border file:border-border-strong file:bg-surface file:px-3 file:text-sm" />
        </Field>
      </div>

      <dl className="mt-4 space-y-1 text-xs text-muted">
        {Object.entries(COLUMN_HELP).map(([k, v]) => (
          <div key={k}><dt className="inline font-medium capitalize text-text">{k}: </dt><dd className="inline">{v}</dd></div>
        ))}
      </dl>
      <p className="mt-3 text-sm">
        Templates:{" "}
        {Object.keys(REQUIRED_COLUMNS).map((k, i) => (
          <span key={k}>{i > 0 && " · "}<a className="text-accent hover:underline" href={`/api/export/${k}?template=1`}>{k}.csv</a></span>
        ))}
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <SubmitButton name="mode" value="check" variant="secondary" pendingLabel="Checking…">Check file</SubmitButton>
        <SubmitButton name="mode" value="import" pendingLabel="Importing…">Import file</SubmitButton>
        <button
          type="submit"
          formAction="/api/clean"
          formMethod="post"
          formEncType="multipart/form-data"
          className="inline-flex h-10 items-center rounded-ui px-3 text-sm font-medium text-accent hover:underline"
        >
          Download cleaned CSV
        </button>
      </div>
      <p className="mt-3 text-xs text-muted">
        Check file tells you what would happen, including repeated rows, people who may be listed twice, rows already in ADL and rejected rows. It saves nothing.
        Exact repeats are always removed automatically, so they never import twice. Rows that share an email but differ are kept once (the first) and listed so you can look.
        Same name with a different email is only flagged, because it may be two people. Download cleaned CSV gives you the file with those repeats removed and values standardised, without importing it.
        Importing adds the valid rows even if others are rejected. Media pages with the same platform and handle are updated.
      </p>
    </form>
  );
}
