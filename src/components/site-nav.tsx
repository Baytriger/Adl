"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme";
import { buttonClass } from "./button-styles";

const LINKS = [
  { href: "#product", label: "Product" },
  { href: "#capabilities", label: "Capabilities" },
  { href: "#workflow", label: "How it works" },
  { href: "#security", label: "Security" },
];

export function SiteNav() {
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
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur-sm">
      <nav aria-label="Main" className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="ADL home">
          <Logo />
        </Link>
        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="rounded-ui px-3 py-2 text-sm text-muted transition-colors hover:text-text">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/sign-in" className={`${buttonClass("primary")} hidden h-9 sm:inline-flex`}>
            Sign in
          </Link>
          <button
            ref={toggleRef}
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-ui border border-border bg-surface md:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
          </button>
        </div>
      </nav>
      {open && (
        <div id="mobile-menu" className="border-t border-border bg-bg md:hidden">
          <ul className="mx-auto max-w-6xl px-4 py-2 sm:px-6">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center text-[15px]"
                >
                  {l.label}
                </a>
              </li>
            ))}
            <li className="py-2">
              <Link href="/sign-in" className={`${buttonClass("primary")} w-full justify-center`}>
                Sign in
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
