"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Activity, BarChart3, Database, LayoutDashboard, Menu, Settings, ShieldCheck, Users, UsersRound, X, CalendarDays, Globe,
} from "lucide-react";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme";

type Item = { href: string; label: string; icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>; admin?: boolean };

const ITEMS: Item[] = [
  { href: "/app", label: "Overview", icon: LayoutDashboard },
  { href: "/app/members", label: "Members", icon: Users },
  { href: "/app/events", label: "Events", icon: CalendarDays },
  { href: "/app/media", label: "Media pages", icon: Globe },
  { href: "/app/datasets", label: "Data sources", icon: Database },
  { href: "/app/reports", label: "Reports", icon: BarChart3 },
  { href: "/app/team", label: "Team", icon: UsersRound, admin: true },
  { href: "/app/audit", label: "Audit log", icon: Activity, admin: true },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

function NavList({ role, onNavigate }: { role: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-0.5">
      {ITEMS.filter((i) => !i.admin || role === "admin").map((i) => {
        const active = i.href === "/app" ? pathname === "/app" : pathname.startsWith(i.href);
        return (
          <li key={i.href}>
            <Link
              href={i.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-10 items-center gap-3 rounded-ui px-3 text-sm transition-colors ${
                active ? "bg-accent-soft font-medium text-accent" : "text-muted hover:bg-surface-2 hover:text-text"
              }`}
            >
              <i.icon size={17} aria-hidden />
              {i.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function AppShell({
  role,
  name,
  email,
  signOutAction,
  children,
}: {
  role: string;
  name: string;
  email: string;
  signOutAction: () => Promise<void>;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const account = (
    <div className="border-t border-border p-3">
      <p className="truncate text-sm font-medium">{name}</p>
      <p className="truncate text-xs text-muted">{email}</p>
      <p className="mt-1 text-xs capitalize text-muted">
        <ShieldCheck size={12} className="mr-1 inline align-[-1px]" aria-hidden />
        {role}
      </p>
      <form action={signOutAction} className="mt-3">
        <button
          type="submit"
          className="h-9 w-full rounded-ui border border-border-strong text-sm transition-colors hover:bg-surface-2"
        >
          Sign out
        </button>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-ui focus:bg-surface focus:px-3 focus:py-2"
      >
        Skip to content
      </a>

      <aside className="hidden border-r border-border bg-surface lg:flex lg:h-screen lg:flex-col lg:sticky lg:top-0">
        <div className="flex h-14 items-center px-4">
          <Link href="/app" aria-label="ADL workspace home"><Logo /></Link>
        </div>
        <nav aria-label="Workspace" className="flex-1 overflow-y-auto px-3 py-2">
          <NavList role={role} />
        </nav>
        {account}
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-bg/90 px-4 backdrop-blur-sm lg:px-8">
          <button
            ref={toggleRef}
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-ui border border-border bg-surface lg:hidden"
            aria-label="Open navigation"
            aria-expanded={open}
            aria-controls="mobile-drawer"
            onClick={() => setOpen(true)}
          >
            <Menu size={18} aria-hidden />
          </button>
          <span className="lg:hidden"><Logo /></span>
          <div className="ml-auto"><ThemeToggle /></div>
        </header>
        <main id="content" className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          />
          <div id="mobile-drawer" className="absolute inset-y-0 left-0 flex w-[min(84vw,300px)] flex-col bg-surface shadow-xl">
            <div className="flex h-14 items-center justify-between px-4">
              <Logo />
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-ui"
                aria-label="Close navigation"
                onClick={() => { setOpen(false); toggleRef.current?.focus(); }}
              >
                <X size={18} aria-hidden />
              </button>
            </div>
            <nav aria-label="Workspace" className="flex-1 overflow-y-auto px-3 py-2">
              <NavList role={role} onNavigate={() => setOpen(false)} />
            </nav>
            {account}
          </div>
        </div>
      )}
    </div>
  );
}

