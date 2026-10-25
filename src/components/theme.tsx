"use client";

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

// The <html data-theme> attribute (set by the pre-paint script) is the single source of truth.
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const getSnapshot = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");
const getServerSnapshot = (): Theme => "light";

const ThemeCtx = createContext<{ theme: Theme; toggle: () => void } | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    const next: Theme = getSnapshot() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("adl-theme", next);
    } catch {
      // Storage can be unavailable (private mode); the theme still applies for this visit.
    }
    listeners.forEach((l) => l());
  }, []);

  return <ThemeCtx.Provider value={{ theme, toggle }}>{children}</ThemeCtx.Provider>;
}

export function ThemeToggle() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) return null;
  const isDark = ctx.theme === "dark";
  return (
    <button
      type="button"
      onClick={ctx.toggle}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="inline-flex h-9 w-9 items-center justify-center rounded-ui border border-border bg-surface text-text transition-colors hover:bg-surface-2"
    >
      {isDark ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
    </button>
  );
}
