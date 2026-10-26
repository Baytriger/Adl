import Papa from "papaparse";
import { NextResponse } from "next/server";
import { db, schema } from "@/server/db";
import { getUserOrNull } from "@/server/session";
import { DATASETS, TEMPLATES, csvSafe, type DatasetKey } from "@/lib/import";

export const dynamic = "force-dynamic";

const iso = (d: Date) => d.toISOString().slice(0, 10);

export async function GET(req: Request, ctx: { params: Promise<{ dataset: string }> }) {
  const user = await getUserOrNull("viewer");
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const { dataset } = await ctx.params;
  if (!(DATASETS as readonly string[]).includes(dataset)) {
    return NextResponse.json({ error: "Unknown dataset" }, { status: 404 });
  }
  const key = dataset as DatasetKey;
  const template = new URL(req.url).searchParams.get("template") === "1";

  let csv: string;
  if (template) {
    csv = TEMPLATES[key];
  } else if (key === "members") {
    const rows = await db.select().from(schema.members);
    csv = Papa.unparse({
      fields: ["full_name", "email", "region", "level", "joined_at"],
      data: rows.map((r) => [csvSafe(r.fullName), csvSafe(r.email), csvSafe(r.region), r.level, iso(r.joinedAt)]),
    });
  } else if (key === "events") {
    const rows = await db.select().from(schema.events);
    csv = Papa.unparse({
      fields: ["title", "starts_at", "region", "turned_up", "participated"],
      data: rows.map((r) => [csvSafe(r.title), iso(r.startsAt), csvSafe(r.region), r.turnedUp, r.participated]),
    });
  } else {
    const rows = await db.select().from(schema.mediaPages);
    csv = Papa.unparse({
      fields: ["platform", "handle", "url", "followers", "posts", "recorded_at"],
      data: rows.map((r) => [csvSafe(r.platform), csvSafe(r.handle), csvSafe(r.url), r.followers, r.posts, iso(r.recordedAt)]),
    });
  }

  if (!template) {
    await db.insert(schema.auditLog).values({ actor: user.email, action: "export.csv", target: key });
  }
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="adl-${key}${template ? "-template" : ""}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
