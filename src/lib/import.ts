import Papa from "papaparse";
import { z } from "zod";
import { LEVELS as LEVEL_VALUES } from "@/server/db/schema";
import { matchColumns, nameKey, normalizeLevel, normalizeRegion, tidy } from "./normalize";

export const DATASETS = ["members", "events", "media"] as const;
export type DatasetKey = (typeof DATASETS)[number];

const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));
const count = z.coerce.number().int().min(0).max(100_000_000);
const date = z
  .string()
  .trim()
  .min(1)
  .transform((v, ctx) => {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: "custom", message: "must be a valid date (e.g. 2026-03-14)" });
      return z.NEVER;
    }
    return d;
  });

export const memberRow = z.object({
  full_name: z.string().trim().min(2, "name is too short").max(120),
  email: optionalText(200).pipe(z.email().optional()),
  region: text(80),
  level: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.enum(LEVEL_VALUES, { error: `level must be one of: ${LEVEL_VALUES.join(", ")}` })),
  joined_at: date,
});

export const eventRow = z
  .object({
    title: text(160),
    starts_at: date,
    region: optionalText(80),
    turned_up: count,
    participated: count,
  })
  .refine((r) => r.participated <= r.turned_up, {
    message: "participated cannot be greater than turned_up",
    path: ["participated"],
  });

export const mediaRow = z.object({
  platform: text(40).transform((v) => v.toLowerCase()),
  handle: text(120),
  url: optionalText(300).pipe(z.url().optional()),
  followers: count,
  posts: count,
  recorded_at: date,
});

export type MemberRow = z.output<typeof memberRow>;
export type EventRow = z.output<typeof eventRow>;
export type MediaRow = z.output<typeof mediaRow>;

export const schemas = { members: memberRow, events: eventRow, media: mediaRow } as const;

export const COLUMNS: Record<DatasetKey, string[]> = {
  members: ["full_name", "email", "region", "level", "joined_at"],
  events: ["title", "starts_at", "region", "turned_up", "participated"],
  media: ["platform", "handle", "url", "followers", "posts", "recorded_at"],
};

export const TEMPLATES: Record<DatasetKey, string> = {
  members: "full_name,email,region,level,joined_at\n",
  events: "title,starts_at,region,turned_up,participated\n",
  media: "platform,handle,url,followers,posts,recorded_at\n",
};

export const REQUIRED_COLUMNS: Record<DatasetKey, string[]> = {
  members: ["full_name", "region", "level", "joined_at"],
  events: ["title", "starts_at", "turned_up", "participated"],
  media: ["platform", "handle", "followers", "posts", "recorded_at"],
};

export type RowError = { row: number; message: string };

/** What the reader did to the file, so the person can see and trust it. */
export type ParseNotes = {
  /** "Full Name → full_name" for every column that was used. */
  columns: string[];
  /** Columns in the file that ADL has no use for. */
  ignored: string[];
  /** "uk → United Kingdom (11)" style summaries of values that were standardised. */
  changes: string[];
  /** Row numbers whose email was not a valid address and was left blank. */
  blankedEmails: number[];
};

export type ParseResult<T> = {
  rows: T[];
  /** Spreadsheet row number of each valid row (header is row 1). */
  rowNums: number[];
  errors: RowError[];
  total: number;
  notes: ParseNotes;
};

export const MAX_ROWS = 20_000;
export const MAX_BYTES = 5 * 1024 * 1024;

const emptyNotes = (): ParseNotes => ({ columns: [], ignored: [], changes: [], blankedEmails: [] });

/* ---------- reading files into a table ---------- */
export type Table = { headers: string[]; records: string[][] };

export function csvToTable(csv: string): Table {
  const parsed = Papa.parse<string[]>(csv.replace(/^﻿/, ""), { skipEmptyLines: "greedy" });
  const [headers = [], ...records] = parsed.data;
  return { headers: headers.map((h) => String(h ?? "")), records };
}

/** Spreadsheet cells -> text. Dates become ISO timestamps rounded to the second. */
export function cellText(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date) return new Date(Math.round(v.getTime() / 1000) * 1000).toISOString();
  return String(v);
}

export function sheetToTable(rows: unknown[][]): Table {
  const [headers = [], ...records] = rows;
  return {
    headers: headers.map(cellText),
    records: records.map((r) => r.map(cellText)).filter((r) => r.some((c) => c.trim() !== "")),
  };
}

/* ---------- validating a table ---------- */
function fail(total: number, row: number, message: string, notes = emptyNotes()): ParseResult<Record<string, unknown>> {
  return { rows: [], rowNums: [], total, errors: [{ row, message }], notes };
}

/** Match columns, standardise values, then validate each row. Row numbers count the header as row 1. */
export function parseTable(dataset: DatasetKey, table: Table): ParseResult<Record<string, unknown>> {
  const total = table.records.length;
  if (total > MAX_ROWS) return fail(total, 0, `File has ${total} rows; the limit is ${MAX_ROWS}.`);

  const { map, unused } = matchColumns(dataset, table.headers);
  const missing = REQUIRED_COLUMNS[dataset].filter((k) => !(k in map));
  if (missing.length) {
    return fail(total, 1, `Couldn't find a column for: ${missing.join(", ")}. Check the first row has column names (see the template).`);
  }
  const notes = emptyNotes();
  notes.columns = Object.entries(map).map(([target, i]) => `${tidy(table.headers[i])} → ${target}`);
  notes.ignored = unused;

  const regionChanges = new Map<string, { to: string; n: number }>();
  const levelFuzzy = new Map<string, { to: string; n: number }>();
  const schema = schemas[dataset];
  const rows: Record<string, unknown>[] = [];
  const rowNums: number[] = [];
  const errors: RowError[] = [];

  table.records.forEach((cells, i) => {
    const rowNum = i + 2;
    const raw: Record<string, string> = {};
    for (const [target, idx] of Object.entries(map)) raw[target] = cells[idx] ?? "";

    if (dataset === "members") {
      raw.full_name = tidy(raw.full_name ?? "");
      const email = (raw.email ?? "").replace(/\s+/g, "").toLowerCase();
      if (email && !z.email().safeParse(email).success) {
        notes.blankedEmails.push(rowNum);
        raw.email = "";
      } else raw.email = email;

      const region = normalizeRegion(raw.region ?? "");
      if (region.changed && (raw.region ?? "").trim()) {
        const key = tidy(raw.region);
        const e = regionChanges.get(key);
        if (e) e.n++;
        else regionChanges.set(key, { to: region.value, n: 1 });
      }
      if ((raw.region ?? "").trim()) raw.region = region.value;

      const level = normalizeLevel(raw.level ?? "");
      if (level) {
        if (level.fuzzy) {
          const key = tidy(raw.level);
          const e = levelFuzzy.get(key);
          if (e) e.n++;
          else levelFuzzy.set(key, { to: level.value, n: 1 });
        }
        raw.level = level.value;
      }
    }

    const result = schema.safeParse(raw);
    if (result.success) {
      rows.push(result.data as Record<string, unknown>);
      rowNums.push(rowNum);
    } else {
      const issue = result.error.issues[0];
      const field = issue.path.join(".") || "row";
      errors.push({ row: rowNum, message: `${field}: ${issue.message}` });
    }
  });

  const top = (m: Map<string, { to: string; n: number }>, label: string) =>
    [...m.entries()]
      .sort((a, b) => b[1].n - a[1].n)
      .map(([from, v]) => `${label} "${from}" → ${v.to}${v.n > 1 ? ` (${v.n})` : ""}`);
  notes.changes = [...top(regionChanges, "Region"), ...top(levelFuzzy, "Level, read from text")];
  return { rows, rowNums, errors, total, notes };
}

/** Parse and validate CSV text. */
export function parseDataset(dataset: DatasetKey, csv: string): ParseResult<Record<string, unknown>> {
  return parseTable(dataset, csvToTable(csv));
}

/* ---------- duplicates ---------- */
const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();

/** The identity of a row: two rows with the same key are the same record. */
export function rowKey(dataset: DatasetKey, row: Record<string, unknown>): string {
  if (dataset === "members") {
    // Email identifies a person. Without one, fall back to the name so a file imported twice adds nothing.
    const e = norm(row.email);
    return e || `name:${nameKey(String(row.full_name ?? ""))}`;
  }
  if (dataset === "events") {
    const d = (row.starts_at as Date).toISOString().slice(0, 10);
    return `${norm(row.title)}|${d}|${norm(row.region)}`;
  }
  return `${norm(row.platform)}|${norm(row.handle)}`;
}

/** Everything about a row except its date. Same key and same detail = an exact repeat. */
function detail(dataset: DatasetKey, row: Record<string, unknown>): string {
  if (dataset === "members") return [nameKey(String(row.full_name)), norm(row.region), norm(row.level)].join("|");
  if (dataset === "events") return [row.turned_up, row.participated].join("|");
  return [row.followers, row.posts, norm(row.url)].join("|");
}

export type Pair = { row: number; firstRow: number };

export type Existing = {
  /** rowKey of every record already stored. */
  keys: Set<string>;
  /** Members only: nameKey -> emails already stored under that name. */
  names?: Map<string, string[]>;
};

export type Analysis = {
  /** Rows that would be added. */
  fresh: number;
  /** Rows already stored in ADL: members and events are skipped, media pages are updated. */
  existing: number;
  /** Same key and same details as an earlier row. Removed automatically. */
  exactDupes: Pair[];
  /** Same key as an earlier row but different details. Removed (first kept; media: last kept). Worth a look. */
  conflictDupes: Pair[];
  /** Members: same name, different or missing email. NOT removed, they may be different people. */
  sameName: Pair[];
  /** Members: rows whose name matches someone already in ADL under a different email. */
  sameNameExisting: number[];
  /** Rows (by number) that the import leaves out because an earlier/later row replaces them. */
  skipRows: Set<number>;
  warnings: string[];
};

/**
 * Compare validated rows with each other and with what ADL already holds. Pure, so it can be tested.
 * Members and events keep the first of a repeat; media pages keep the last (newest numbers win).
 */
export function analyze(
  dataset: DatasetKey,
  rows: Record<string, unknown>[],
  rowNums: number[],
  existing: Existing = { keys: new Set() },
): Analysis {
  const keepLast = dataset === "media";
  const seen = new Map<string, number>(); // key -> index of the row currently kept
  const exactDupes: Pair[] = [];
  const conflictDupes: Pair[] = [];
  const skipRows = new Set<number>();

  rows.forEach((row, i) => {
    const key = rowKey(dataset, row);
    const prev = seen.get(key);
    if (prev === undefined) {
      seen.set(key, i);
      return;
    }
    const same = detail(dataset, rows[prev]) === detail(dataset, row);
    const [dropped, kept] = keepLast ? [prev, i] : [i, prev];
    (same ? exactDupes : conflictDupes).push({ row: rowNums[dropped], firstRow: rowNums[kept] });
    skipRows.add(rowNums[dropped]);
    seen.set(key, kept);
  });

  let existingCount = 0;
  for (const key of seen.keys()) if (existing.keys.has(key)) existingCount++;
  const keptIdx = rows.map((_, i) => i).filter((i) => !skipRows.has(rowNums[i]));
  const kept = keptIdx.map((i) => rows[i]);
  const fresh = kept.length - existingCount;

  const sameName: Pair[] = [];
  const sameNameExisting: number[] = [];
  const warnings: string[] = [];

  if (dataset === "members") {
    const byName = new Map<string, { row: number; email: string }>();
    keptIdx.forEach((i) => {
      const row = rows[i];
      const num = rowNums[i];
      const nk = nameKey(String(row.full_name));
      const email = norm(row.email);
      const first = byName.get(nk);
      if (first) {
        if (first.email !== email) sameName.push({ row: num, firstRow: first.row });
      } else byName.set(nk, { row: num, email });
      const stored = existing.names?.get(nk);
      if (stored && !stored.includes(email) && !existing.keys.has(rowKey("members", row))) sameNameExisting.push(num);
    });

    const byNorm = new Map<string, Map<string, number>>();
    for (const row of kept) {
      const region = String(row.region);
      const n = region.toLowerCase().replace(/[^a-z0-9]/g, "");
      const m = byNorm.get(n) ?? new Map<string, number>();
      m.set(region, (m.get(region) ?? 0) + 1);
      byNorm.set(n, m);
    }
    for (const m of byNorm.values()) {
      if (m.size > 1) warnings.push(`Region is spelled more than one way: ${[...m.keys()].map((k) => `"${k}"`).join(", ")}. They will count as separate regions.`);
    }
    const noEmail = kept.filter((r) => !norm(r.email)).length;
    if (noEmail) warnings.push(`${noEmail} member(s) have no email, so they are matched by name only.`);
    const unknown = kept.filter((r) => r.region === "Unknown").length;
    if (unknown) warnings.push(`${unknown} member(s) have a region that isn't a real place and were set to "Unknown".`);
  }

  return { fresh, existing: existingCount, exactDupes, conflictDupes, sameName, sameNameExisting, skipRows, warnings };
}

/** Spreadsheet apps execute cells that start with these characters. Neutralise on export. */
export function csvSafe(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}
