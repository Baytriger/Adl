import "server-only";
import { db, schema } from "./db";
import {
  MAX_BYTES,
  csvToTable,
  rowKey,
  sheetToTable,
  type Analysis,
  type DatasetKey,
  type Existing,
  type ParseResult,
  type Table,
} from "@/lib/import";
import { nameKey } from "@/lib/normalize";

const { members, events, mediaPages } = schema;

/** Read an uploaded .csv or .xlsx into a table. */
export async function readUpload(file: File): Promise<{ table: Table; note?: string } | { error: string }> {
  if (file.size === 0) return { error: "Choose a CSV or Excel (.xlsx) file to upload." };
  if (file.size > MAX_BYTES) return { error: "That file is over 5 MB. Split it and upload in parts." };
  const buf = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();

  if (name.endsWith(".xls")) return { error: "Old .xls files aren't supported. In Excel choose Save As → .xlsx or CSV." };
  const isZip = buf[0] === 0x50 && buf[1] === 0x4b; // "PK"
  if (name.endsWith(".xlsx") || isZip) {
    try {
      const { default: readXlsxFile } = await import("read-excel-file/node");
      const sheets = await readXlsxFile(buf);
      const sheet = sheets.find((s) => s.data.length > 0);
      if (!sheet) return { error: "That workbook has no data." };
      const note = sheets.length > 1 ? `Read the sheet "${sheet.sheet}". Other sheets in the workbook were ignored.` : undefined;
      return { table: sheetToTable(sheet.data as unknown[][]), note };
    } catch {
      return { error: "Couldn't read that Excel file. Re-save it as .xlsx or export it as CSV." };
    }
  }
  return { table: csvToTable(buf.toString("utf8")) };
}

/** What ADL already holds, in the shape the duplicate check needs. */
export async function loadExisting(dataset: DatasetKey): Promise<Existing> {
  const keys = new Set<string>();
  if (dataset === "members") {
    const names = new Map<string, string[]>();
    for (const r of await db.select({ name: members.fullName, email: members.email }).from(members)) {
      const email = (r.email ?? "").toLowerCase();
      keys.add(rowKey("members", { email, full_name: r.name }));
      const nk = nameKey(r.name);
      names.set(nk, [...(names.get(nk) ?? []), email]);
    }
    return { keys, names };
  }
  if (dataset === "events") {
    for (const r of await db.select().from(events)) {
      keys.add(rowKey("events", { title: r.title, starts_at: r.startsAt, region: r.region }));
    }
  } else {
    for (const r of await db.select().from(mediaPages)) {
      keys.add(rowKey("media", { platform: r.platform, handle: r.handle }));
    }
  }
  return { keys };
}

const plural = (n: number, word: string) => `${n.toLocaleString("en")} ${word}${n === 1 ? "" : "s"}`;
const WHAT: Record<DatasetKey, string> = { members: "member", events: "event", media: "media page" };
const list = (items: string[], max = 8) => items.slice(0, max).join("; ") + (items.length > max ? `; and ${items.length - max} more` : "");
const rowsLabel = (rows: number[], max = 12) => `row${rows.length === 1 ? "" : "s"} ${rows.slice(0, max).join(", ")}${rows.length > max ? "…" : ""}`;

/** Plain-language report of what a file contains and what an import would do. */
export function describeCheck(dataset: DatasetKey, parsed: ParseResult<Record<string, unknown>>, a: Analysis, sheetNote?: string) {
  const w = WHAT[dataset];
  const lines: string[] = [];
  if (sheetNote) lines.push(sheetNote);
  if (parsed.notes.columns.length) lines.push(`Columns read: ${parsed.notes.columns.join(", ")}.`);
  if (parsed.notes.ignored.length) lines.push(`Columns not used: ${parsed.notes.ignored.join(", ")}.`);
  if (parsed.notes.changes.length) lines.push(`Standardised: ${list(parsed.notes.changes, 12)}.`);

  const rep = a.exactDupes;
  if (rep.length) {
    lines.push(
      `${plural(rep.length, "exact repeat")} removed automatically (same ${dataset === "members" ? "email and details" : "record"}${dataset === "media" ? ", newest kept" : ", first kept"}): ${list(rep.map((d) => `row ${d.row} repeats row ${d.firstRow}`))}.`,
    );
  }
  if (a.conflictDupes.length) {
    lines.push(
      `${a.conflictDupes.length.toLocaleString("en")} row${a.conflictDupes.length === 1 ? "" : "s"} ${dataset === "members" ? "share an email with another row" : "repeat another row"} but differ in details. ${dataset === "media" ? "The newest is kept" : "The first is kept"}, so check these: ${list(a.conflictDupes.map((d) => `row ${d.row} vs row ${d.firstRow}`))}.`,
    );
  }
  if (a.sameName.length) {
    lines.push(`${a.sameName.length.toLocaleString("en")} ${a.sameName.length === 1 ? "possible duplicate person" : "possible duplicate people"}: same name, different or missing email. These are imported, so review them: ${list(a.sameName.map((d) => `row ${d.row} looks like row ${d.firstRow}`))}.`);
  }
  if (a.sameNameExisting.length) {
    lines.push(`${plural(a.sameNameExisting.length, "row")} have the same name as someone already in ADL but a different email (${rowsLabel(a.sameNameExisting)}). They will be imported.`);
  }
  if (a.existing) {
    lines.push(
      dataset === "media"
        ? `${plural(a.existing, w)} already in ADL will be updated with the new numbers.`
        : `${plural(a.existing, w)} already in ADL will be skipped.`,
    );
  }
  if (parsed.notes.blankedEmails.length) {
    lines.push(`${plural(parsed.notes.blankedEmails.length, "email")} weren't valid addresses and will be left blank (${rowsLabel(parsed.notes.blankedEmails)}).`);
  }
  for (const e of parsed.errors.slice(0, 15)) lines.push(e.row ? `Rejected, row ${e.row}: ${e.message}` : e.message);
  if (parsed.errors.length > 15) lines.push(`…and ${parsed.errors.length - 15} more rejected rows.`);
  lines.push(...a.warnings);

  const bad = parsed.errors.length;
  const headline = `Checked ${plural(parsed.total, "row")}: ${plural(a.fresh, w)} ready to add${bad ? `, ${bad} rejected` : ""}. Nothing has been imported yet.`;
  return { headline, lines };
}
