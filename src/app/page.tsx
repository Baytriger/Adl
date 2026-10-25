import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Database, FileSpreadsheet, KeyRound, ListChecks, ShieldCheck, Users } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { Reveal } from "@/components/reveal";
import { Logo } from "@/components/logo";
import { buttonClass } from "@/components/button-styles";

export const metadata: Metadata = {
  title: { absolute: "ADL | Members, events and media in one workspace" },
  description:
    "ADL keeps member records, event turnout and media page numbers in one signed-in workspace, so every report reads from the same data.",
  alternates: { canonical: "/" },
};

const CAPABILITIES = [
  {
    icon: Users,
    title: "Member records",
    body: "Track members by region and professional level. Totals and breakdowns come from the records themselves, not from numbers typed into a report.",
  },
  {
    icon: ListChecks,
    title: "Event turnout",
    body: "Record how many people turned up to each event and how many took part, then see the participation rate across any date range.",
  },
  {
    icon: BarChart3,
    title: "Media pages",
    body: "Keep followers and post counts for each media page next to your member and event data, with the date every figure was recorded.",
  },
  {
    icon: FileSpreadsheet,
    title: "CSV import and export",
    body: "Load existing spreadsheets with row-by-row validation. Rows with problems are reported by line number instead of failing the whole file.",
  },
];

const STEPS = [
  { n: "1", title: "Import", body: "Upload CSV or Excel files for members, events and media pages." },
  { n: "2", title: "Validate", body: "Each row is checked. Errors are listed by row so you can fix and re-upload." },
  { n: "3", title: "Measure", body: "One definition per metric, shared by every dashboard and report." },
  { n: "4", title: "Report", body: "Filter by date, region or level and export what you see." },
];

const SECURITY = [
  "Invite-only access. There is no public sign-up: an admin creates each account.",
  "Passwords are stored as salted hashes, never in plain text. Temporary passwords must be replaced at first sign-in, and repeated wrong guesses lock sign-in for a while.",
  "Roles (admin, editor, viewer) are checked on the server for every page and action.",
  "Sensitive changes, such as imports and role changes, are written to an audit log.",
  "Sessions expire automatically and an admin can disable an account at any time.",
];

function ProductPreview() {
  const tiles = [
    { label: "Members", fields: "region · professional level" },
    { label: "Events", fields: "turned up · participated" },
    { label: "Media pages", fields: "followers · posts" },
  ];
  return (
    <figure
      className="overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow)]"
      aria-label="Illustration of the ADL workspace layout"
    >
      <div className="flex items-center gap-1.5 border-b border-border bg-surface-2 px-4 py-2.5" aria-hidden="true">
        <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
        <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
        <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
      </div>
      <div className="grid gap-px bg-border sm:grid-cols-3">
        {tiles.map((t) => (
          <div key={t.label} className="bg-surface p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">{t.label}</p>
            <div className="mt-3 h-6 w-20 rounded bg-surface-2" aria-hidden="true" />
            <p className="mt-3 text-xs text-muted">{t.fields}</p>
          </div>
        ))}
      </div>
      <div className="border-t border-border p-4">
        <div className="flex items-end gap-2" aria-hidden="true">
          {[40, 64, 52, 80, 58, 72, 90].map((h, i) => (
            <div key={i} className="flex-1 rounded-t bg-accent/70" style={{ height: `${h}px` }} />
          ))}
        </div>
        <figcaption className="mt-3 text-xs text-muted">
          Illustrative layout only. The workspace shows your own records once you import them.
        </figcaption>
      </div>
    </figure>
  );
}

export default function Home() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-ui focus:bg-surface focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <SiteNav />
      <main id="main">
        <section id="product" className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:py-24">
          <Reveal>
            <p className="text-sm font-medium text-accent">For ADL members, events and media</p>
            <h1 className="mt-3 text-[clamp(2rem,5vw,3.25rem)] font-semibold leading-[1.1] tracking-tight">
              One place for who your members are, who turned up, and where you&apos;re reaching people.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">
              ADL keeps member records, event turnout and media page numbers together. Every dashboard and
              report reads from the same data, so the numbers always agree.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/sign-in" className={buttonClass("primary")}>
                Sign in to ADL
              </Link>
              <a href="#workflow" className={buttonClass("secondary")}>
                See how it works
              </a>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <ProductPreview />
          </Reveal>
        </section>

        <section id="capabilities" className="border-t border-border bg-surface">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
            <Reveal>
              <h2 className="max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
                What you can do with it
              </h2>
            </Reveal>
            <ul className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {CAPABILITIES.map((c, i) => (
                <li key={c.title}>
                <Reveal delay={i * 0.04}>
                  <div className="flex gap-4">
                    <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-ui bg-accent-soft text-accent">
                      <c.icon size={18} aria-hidden />
                    </span>
                    <div>
                      <h3 className="font-medium">{c.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted">{c.body}</p>
                    </div>
                  </div>
                </Reveal>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="workflow" className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
          <Reveal>
            <h2 className="max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
              From spreadsheet to shared numbers
            </h2>
            <p className="mt-3 max-w-2xl text-muted">
              Data goes in once. Everything else is calculated from it.
            </p>
          </Reveal>
          <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.n}>
                <Reveal delay={i * 0.05}>
                  <div className="border-t-2 border-accent pt-4">
                    <p className="tnum text-sm font-medium text-accent">Step {s.n}</p>
                    <h3 className="mt-1 font-medium">{s.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{s.body}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </section>

        <section id="security" className="border-t border-border bg-surface">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:py-20">
            <Reveal>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-ui bg-accent-soft text-accent">
                <ShieldCheck size={18} aria-hidden />
              </span>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">Access you control</h2>
              <p className="mt-3 text-muted">
                What ADL does today to protect your data. We don&apos;t claim certifications or compliance
                programs we don&apos;t hold.
              </p>
            </Reveal>
            <Reveal delay={0.06}>
              <ul className="space-y-4">
                {SECURITY.map((s) => (
                  <li key={s} className="flex gap-3 text-[15px] leading-relaxed">
                    <KeyRound size={16} className="mt-1 shrink-0 text-accent" aria-hidden />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
          <Reveal>
            <div className="rounded-xl border border-border bg-surface p-8 sm:p-10">
              <Database size={20} className="text-accent" aria-hidden />
              <h2 className="mt-4 text-2xl font-semibold tracking-tight">Already have access?</h2>
              <p className="mt-2 max-w-xl text-muted">
                Sign in with your email and password. If you don&apos;t have an account yet, ask an ADL admin to create one
                for you.
              </p>
              <Link href="/sign-in" className={`${buttonClass("primary")} mt-6`}>
                Sign in to ADL
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Logo />
          <nav aria-label="Footer" className="flex gap-5">
            <a href="#product" className="hover:text-text">Product</a>
            <a href="#security" className="hover:text-text">Security</a>
            <Link href="/sign-in" className="hover:text-text">Sign in</Link>
          </nav>
          <p>&copy; {new Date().getFullYear()} ADL</p>
        </div>
      </footer>
    </>
  );
}
