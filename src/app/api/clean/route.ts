import Papa from "papaparse";
import { NextResponse } from "next/server";
import { getUserOrNull } from "@/server/session";
import { readUpload } from "@/server/upload";
import { COLUMNS, DATASETS, analyze, csvSafe, parseTable, type DatasetKey } from "@/lib/import";

export const dynamic = "force-dynamic";

const text = (message: string, status: number) =>
  new NextResponse(message, { status, headers: { "content-type": "text/plain; charset=utf-8" } });

/**
 * Returns the uploaded file as an ADL-format CSV: columns renamed, values standardised, rejected rows
 * left out, and repeated rows removed. Nothing is saved. Same permission as importing.
 */
export async function POST(req: Request) {
  const user = await getUserOrNull("editor");
  if (!user) return text("Sign in with an editor or admin account to do this.", 401);

  const fd = await req.formData();
  const dataset = String(fd.get("dataset") ?? "") as DatasetKey;
  if (!DATASETS.includes(dataset)) return text("Choose a dataset.", 400);
  const file = fd.get("file");
  if (!(file instanceof File)) return text("Choose a file.", 400);

  const upload = await readUpload(file);
  if ("error" in upload) return text(upload.error, 400);
  const parsed = parseTable(dataset, upload.table);
  if (parsed.rows.length === 0) {
    return text(parsed.errors[0]?.message ?? "There are no valid rows in that file.", 422);
  }
  const a = analyze(dataset, parsed.rows, parsed.rowNums);
  const kept = parsed.rows.filter((_, i) => !a.skipRows.has(parsed.rowNums[i]));

  const cell = (v: unknown) => (v instanceof Date ? v.toISOString() : csvSafe(v == null ? "" : (v as string | number)));
  const csv = Papa.unparse({ fields: COLUMNS[dataset], data: kept.map((r) => COLUMNS[dataset].map((c) => cell(r[c]))) });
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${dataset}-cleaned.csv"`,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
