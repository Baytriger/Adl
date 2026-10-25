import { describe, expect, it } from "vitest";
import { csvSafe, parseDataset } from "@/lib/import";

describe("parseDataset", () => {
  it("accepts valid member rows and normalises level", () => {
    const r = parseDataset("members", "full_name,email,region,level,joined_at\nAda L,ada@example.com,Lagos,Professional,2026-01-05\n");
    expect(r.errors).toEqual([]);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0]).toMatchObject({ full_name: "Ada L", level: "professional" });
  });

  it("reports the row number and field for bad rows and keeps good ones", () => {
    const r = parseDataset("members", "full_name,region,level,joined_at\nAa,Lagos,boss,2026-01-05\nBb,Abuja,mid,2026-02-01\n");
    expect(r.rows).toHaveLength(1);
    expect(r.errors[0].row).toBe(2);
    expect(r.errors[0].message).toContain("level");
  });

  it("rejects files missing required columns", () => {
    const r = parseDataset("events", "title,starts_at\nX,2026-01-01\n");
    expect(r.rows).toHaveLength(0);
    expect(r.errors[0].message).toContain("turned_up");
  });

  it("rejects participated greater than turned_up", () => {
    const r = parseDataset("events", "title,starts_at,turned_up,participated\nMeetup,2026-03-01,10,12\n");
    expect(r.rows).toHaveLength(0);
    expect(r.errors[0].message).toContain("participated");
  });

  it("validates media rows and lowercases platform", () => {
    const r = parseDataset("media", "platform,handle,followers,posts,recorded_at\nX,adl,1200,300,2026-05-01\n");
    expect(r.errors).toEqual([]);
    expect(r.rows[0]).toMatchObject({ platform: "x", followers: 1200 });
  });
});

describe("csvSafe", () => {
  it("neutralises spreadsheet formulas", () => {
    expect(csvSafe("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(csvSafe("Lagos")).toBe("Lagos");
  });
});

import { analyze, parseTable, sheetToTable } from "@/lib/import";
import { matchColumns, nameKey, normalizeLevel, normalizeRegion } from "@/lib/normalize";

const members = (csv: string) => {
  const r = parseDataset("members", `full_name,email,region,level,joined_at\n${csv}`);
  return { ...r, a: (existing: string[] = [], names: [string, string][] = []) =>
    analyze("members", r.rows, r.rowNums, {
      keys: new Set(existing),
      names: new Map(names.map(([n, e]) => [nameKey(n), [e]])),
    }) };
};

describe("duplicates", () => {
  it("removes exact repeats (same email, name, region, level) and reports row numbers", () => {
    const a = members("Ada L,Ada@x.com,Lagos,mid,2026-01-01\nAda L, ada@X.com ,lagos,mid,2026-02-02\nCy,c@x.com,Abuja,mid,2026-01-03\n").a();
    expect(a.exactDupes).toEqual([{ row: 3, firstRow: 2 }]);
    expect(a.conflictDupes).toEqual([]);
    expect(a.skipRows.has(3)).toBe(true);
    expect(a.fresh).toBe(2);
  });

  it("keeps the first of a same-email row with different details and flags it as a conflict", () => {
    const a = members("Ada L,a@x.com,Lagos,mid,2026-01-01\nAda L,a@x.com,Lagos,professional,2026-01-02\n").a();
    expect(a.exactDupes).toEqual([]);
    expect(a.conflictDupes).toEqual([{ row: 3, firstRow: 2 }]);
    expect(a.fresh).toBe(1);
  });

  it("flags the same name with a different email without removing anyone", () => {
    const a = members("Ada Obi,a@x.com,Lagos,mid,2026-01-01\nobi ada,b@x.com,Lagos,mid,2026-01-02\nZed,z@x.com,Lagos,mid,2026-01-03\n").a();
    expect(a.sameName).toEqual([{ row: 3, firstRow: 2 }]);
    expect(a.skipRows.size).toBe(0);
    expect(a.fresh).toBe(3);
  });

  it("flags names that already exist in ADL under another email, and skips emails already stored", () => {
    const a = members("Ada Obi,new@x.com,Lagos,mid,2026-01-01\nBo,old@x.com,Lagos,mid,2026-01-02\n").a(["old@x.com"], [["Ada Obi", "other@x.com"]]);
    expect(a.sameNameExisting).toEqual([2]);
    expect(a.existing).toBe(1);
    expect(a.fresh).toBe(1);
  });

  it("keeps row numbers aligned when invalid rows sit between valid ones", () => {
    const m = members("Aa,a@x.com,Lagos,mid,2026-01-01\nBad,b@x.com,Lagos,boss,2026-01-01\nAa,a@x.com,Lagos,mid,2026-01-02\n");
    expect(m.errors[0].row).toBe(3);
    expect(m.a().exactDupes).toEqual([{ row: 4, firstRow: 2 }]);
  });

  it("warns about regions spelled several ways before standardising is possible, and about missing emails", () => {
    const r = analyze("members", [
      { full_name: "Aa", email: undefined, region: "Lagos", level: "mid" },
      { full_name: "Bb", email: undefined, region: "lagos", level: "mid" },
    ], [2, 3]);
    expect(r.warnings.join(" ")).toMatch(/spelled more than one way/);
    expect(r.warnings.join(" ")).toMatch(/no email/);
  });

  it("treats events with the same title, day and region as one event; different numbers are a conflict", () => {
    const r = parseDataset("events", "title,starts_at,region,turned_up,participated\nMeetup,2026-03-01,Lagos,10,5\nmeetup,2026-03-01,lagos,10,5\nMeetup,2026-03-01,Lagos,12,6\nMeetup,2026-03-02,Lagos,9,4\n");
    const a = analyze("events", r.rows, r.rowNums);
    expect(a.exactDupes).toHaveLength(1);
    expect(a.conflictDupes).toHaveLength(1);
    expect(a.fresh).toBe(2);
  });

  it("keeps the newest of repeated media pages and detects ones already stored", () => {
    const r = parseDataset("media", "platform,handle,followers,posts,recorded_at\nX,adl,1,1,2026-05-01\nx,ADL,5,2,2026-06-01\n");
    const a = analyze("media", r.rows, r.rowNums, { keys: new Set(["x|adl"]) });
    expect(a.conflictDupes).toEqual([{ row: 2, firstRow: 3 }]);
    expect(a.skipRows.has(2)).toBe(true);
    expect(a.existing).toBe(1);
  });
});

describe("members without an email", () => {
  it("are matched by name, so importing the same file twice adds nothing", () => {
    const first = members("Ada Obi,,Lagos,mid,2026-01-01\n");
    const again = members("Obi  Ada,,Lagos,mid,2026-03-01\n").a(["name:ada obi"]);
    expect(first.a().fresh).toBe(1);
    expect(again.existing).toBe(1);
    expect(again.fresh).toBe(0);
  });

  it("removes in-file exact repeats and warns that matching is by name only", () => {
    const a = members("Ada Obi,,Lagos,mid,2026-01-01\nAda Obi,,Lagos,mid,2026-02-01\n").a();
    expect(a.exactDupes).toHaveLength(1);
    expect(a.warnings.join(" ")).toMatch(/matched by name only/);
  });
});

describe("matching the real sign-up sheet", () => {
  const headers = ["ID", "Start time", "Completion time", "Email", "Name", "Full Name", "Email Address ", "Date of Birth\u00a0", "What Country Are You Based?", "Where Are You on Your Data Journey?", "What Would You Love to Gain From This Community?", "How Did You Hear About Data Living?", "Would You Like to Volunteer or Contribute in Any Way?"];

  it("picks Full Name, Email Address, country, journey and Completion time", () => {
    const { map } = matchColumns("members", headers);
    expect(headers[map.full_name]).toBe("Full Name");
    expect(headers[map.email]).toBe("Email Address ");
    expect(headers[map.region]).toBe("What Country Are You Based?");
    expect(headers[map.level]).toBe("Where Are You on Your Data Journey?");
    expect(headers[map.joined_at]).toBe("Completion time");
  });

  it("reads a sheet end to end: standardises values, blanks bad emails, removes repeats", () => {
    const t = sheetToTable([
      headers,
      [1, new Date("2025-08-01T09:55:07.999Z"), new Date("2025-08-01T09:55:39.999Z"), "anonymous", null, "  Ada   Obi ", "ADA@x.com", null, "uk", "Actively learning (courses/bootcamp)", "", "LinkedIn", "Yes"],
      [2, null, new Date("2025-08-02T10:00:00Z"), "anonymous", null, "Ada Obi", "ada@x.com", null, "United Kingdom", "Actively learning (courses/bootcamp)", "", "", ""],
      [3, null, new Date("2025-08-03T10:00:00Z"), "anonymous", null, "Bo Lee", "bo@gmailcom", null, "NIGERIA", "Intern / Entry-level", "", "", ""],
    ].map((r) => r.map((c) => (c instanceof Date ? c : c))) as unknown[][]);
    const r = parseTable("members", t);
    expect(r.errors).toEqual([]);
    expect(r.rows[0]).toMatchObject({ full_name: "Ada Obi", email: "ada@x.com", region: "United Kingdom", level: "learning" });
    expect(r.rows[2]).toMatchObject({ email: undefined, region: "Nigeria", level: "entry" });
    expect((r.rows[0].joined_at as Date).toISOString()).toBe("2025-08-01T09:55:40.000Z");
    expect(r.notes.blankedEmails).toEqual([4]);
    expect(analyze("members", r.rows, r.rowNums).exactDupes).toEqual([{ row: 3, firstRow: 2 }]);
  });

  it("explains which column is missing", () => {
    const r = parseTable("members", sheetToTable([["Full Name", "Email"], ["Ada", "a@x.com"]]));
    expect(r.errors[0].message).toMatch(/region.*level.*joined_at/);
  });
});

describe("normalising values", () => {
  it("fixes region spelling and aliases, and blanks values that cannot be a place", () => {
    expect(normalizeRegion("NIGERIA").value).toBe("Nigeria");
    expect(normalizeRegion(" nigeria ").value).toBe("Nigeria");
    expect(normalizeRegion("uk").value).toBe("United Kingdom");
    expect(normalizeRegion("U.S.").value).toBe("United States");
    expect(normalizeRegion("south africa").value).toBe("South Africa");
    expect(normalizeRegion("NIgeria").value).toBe("Nigeria");
    expect(normalizeRegion("United kingdom").value).toBe("United Kingdom");
    expect(normalizeRegion("South Africa")).toEqual({ value: "South Africa", changed: false });
    for (const junk of ["s", "ddd", "bnmmll", "jj"]) expect(normalizeRegion(junk).value).toBe("Unknown");
  });

  it("reads levels from ids, form labels and clear free text, but not nonsense", () => {
    expect(normalizeLevel("mid")?.value).toBe("mid");
    expect(normalizeLevel("Junior / Mid-level")?.value).toBe("mid");
    expect(normalizeLevel("Actively learning (courses/bootcamp)")).toEqual({ value: "learning", fuzzy: true });
    expect(normalizeLevel("Actively Job hunting ")?.value).toBe("other");
    expect(normalizeLevel("boss")).toBeNull();
  });

  it("compares names regardless of case, accents and word order", () => {
    expect(nameKey("Adeleye  Anne Adewunmi")).toBe(nameKey("adewunmi, anne ADELEYE"));
    expect(nameKey("José")).toBe(nameKey("jose"));
  });
});
