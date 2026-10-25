import { LEVELS, LEVEL_LABELS, type Level } from "@/server/db/schema";

/** Lowercase, collapse spaces, drop accents and punctuation. Used to compare text, never to store it. */
export function fold(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Same person written differently: ignores case, accents, punctuation and word order. */
export function nameKey(v: string): string {
  return fold(v).split(" ").filter(Boolean).sort().join(" ");
}

export const tidy = (v: string) => v.replace(/\s+/g, " ").trim();

/* ---------- levels ---------- */
const LABEL_TO_LEVEL = new Map<string, Level>(LEVELS.map((l) => [fold(LEVEL_LABELS[l]), l]));

const LEVEL_KEYWORDS: [string, Level][] = [
  ["job hunt", "other"],
  ["actively learning", "learning"],
  ["boot camp", "learning"],
  ["bootcamp", "learning"],
  ["student", "learning"],
  ["changing my career", "switching"],
  ["switching", "switching"],
  ["pivot", "switching"],
  ["programming", "exploring"],
  ["curious", "exploring"],
  ["exploring", "exploring"],
  ["getting started", "starting"],
  ["intern", "entry"],
  ["entry", "entry"],
  ["junior", "mid"],
  ["mid level", "mid"],
  ["professional", "professional"],
];

/** Accepts ADL's stage ids, the form's answer labels, and free text that clearly names a stage. */
export function normalizeLevel(raw: string): { value: Level; fuzzy: boolean } | null {
  const k = fold(raw);
  if (!k) return null;
  if ((LEVELS as readonly string[]).includes(k)) return { value: k as Level, fuzzy: false };
  const label = LABEL_TO_LEVEL.get(k);
  if (label) return { value: label, fuzzy: false };
  // The form's "Actively learning (courses/bootcamp)" and similar long answers.
  if (k.length < 12) return null;
  for (const [kw, level] of LEVEL_KEYWORDS) if (k.includes(kw)) return { value: level, fuzzy: true };
  return null;
}

/* ---------- regions ---------- */
const REGION_ALIASES: Record<string, string> = {
  uk: "United Kingdom",
  "u k": "United Kingdom",
  scotland: "United Kingdom",
  england: "United Kingdom",
  wales: "United Kingdom",
  london: "United Kingdom",
  "scotland united kingdom": "United Kingdom",
  us: "United States",
  usa: "United States",
  "u s": "United States",
  "u s a": "United States",
  "united state": "United States",
  "united states of america": "United States",
  nigerian: "Nigeria",
  nigeris: "Nigeria",
  lagos: "Nigeria",
  abuja: "Nigeria",
  "abuja nigeria": "Nigeria",
  "uyo nigeria": "Nigeria",
  "lagos nigeria": "Nigeria",
  "nigeria for now": "Nigeria",
  nairobi: "Kenya",
  indian: "India",
  nederland: "Netherlands",
  uae: "United Arab Emirates",
  "united republic of tanzania": "Tanzania",
  botswama: "Botswana",
  "st lucia": "Saint Lucia",
  "cote d ivoire": "Côte d'Ivoire",
};

const SMALL_WORDS = new Set(["of", "and", "the", "d"]);
const titleCase = (s: string) =>
  s
    .toLowerCase()
    .split(" ")
    .map((w, i) => (i > 0 && SMALL_WORDS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");

/**
 * Standardise a region. Fixes case, spacing, common aliases (UK, USA, Lagos) and replaces
 * values that cannot be a place (one or two letters, no vowels, one repeated letter) with "Unknown".
 */
export function normalizeRegion(raw: string): { value: string; changed: boolean } {
  const original = tidy(raw);
  const k = fold(original);
  const letters = k.replace(/[^a-z]/g, "");
  const known = ["uk", "us", "uae"].includes(letters);
  if (!known && (letters.length < 3 || !/[aeiouy]/.test(letters) || /^(.)\1+$/.test(letters))) {
    return { value: "Unknown", changed: true };
  }
  const alias = REGION_ALIASES[k] ?? (k.startsWith("nigeria") && k.length > 7 ? "Nigeria" : undefined);
  if (alias) return { value: alias, changed: alias !== original };
  const value = titleCase(original);
  return { value, changed: value !== original };
}

/* ---------- column matching ---------- */
const squash = (h: string) => fold(h).replace(/\s/g, "");

type Aliases = { exact: string[]; contains?: string[] };
export const COLUMN_ALIASES: Record<string, Record<string, Aliases>> = {
  members: {
    full_name: { exact: ["fullname", "name", "membername", "fullnames"] },
    email: { exact: ["emailaddress", "email", "emailaddr", "mail"] },
    region: { exact: ["region", "country", "location", "countrybased", "city", "state"], contains: ["country", "region", "location"] },
    level: { exact: ["level", "professionallevel", "stage", "datajourney"], contains: ["datajourney", "journey", "professionallevel"] },
    joined_at: { exact: ["joinedat", "joined", "datejoined", "joindate", "signupdate", "completiontime", "submissiondate", "timestamp", "date"], contains: ["completiontime", "signupdate"] },
  },
  events: {
    title: { exact: ["title", "event", "eventname", "name"] },
    starts_at: { exact: ["startsat", "date", "eventdate", "startdate", "start", "when"] },
    region: { exact: ["region", "location", "city", "country", "venue"] },
    turned_up: { exact: ["turnedup", "attended", "attendance", "turnout", "turnedupcount", "amountturnedup"], contains: ["turnedup", "turnout"] },
    participated: { exact: ["participated", "participants", "participation", "amountparticipated"], contains: ["participated", "participants"] },
  },
  media: {
    platform: { exact: ["platform", "network", "channel", "site"] },
    handle: { exact: ["handle", "username", "page", "pagename", "account"] },
    url: { exact: ["url", "link", "pageurl"] },
    followers: { exact: ["followers", "followercount", "audience", "subscribers"] },
    posts: { exact: ["posts", "postcount", "totalposts"] },
    recorded_at: { exact: ["recordedat", "date", "asof", "recorded", "snapshotdate"] },
  },
};

/** Map each ADL column to a header in the file. Exact names win over partial matches. */
export function matchColumns(dataset: string, headers: string[]): { map: Record<string, number>; unused: string[] } {
  const squashed = headers.map(squash);
  const taken = new Set<number>();
  const map: Record<string, number> = {};
  const spec = COLUMN_ALIASES[dataset];
  for (const [target, a] of Object.entries(spec)) {
    let idx = -1;
    for (const name of a.exact) {
      const i = squashed.findIndex((h, n) => h === name && !taken.has(n));
      if (i >= 0) { idx = i; break; }
    }
    if (idx < 0 && a.contains) {
      idx = squashed.findIndex((h, n) => !taken.has(n) && a.contains!.some((c) => h.includes(c)));
    }
    if (idx >= 0) {
      map[target] = idx;
      taken.add(idx);
    }
  }
  return { map, unused: headers.filter((_, i) => !taken.has(i) && headers[i].trim() !== "") };
}
