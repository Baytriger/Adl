"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * React clears an uncontrolled form after every submit. When the server answers with an error the
 * person should not have to retype everything, so remember what was typed and put it back.
 * Passwords and files are never restored. After a success the form is left cleared.
 */
export function useKeepFields(state: { ok?: string; error?: string } | null) {
  const ref = useRef<HTMLFormElement>(null);
  const typed = useRef<Record<string, string>>({});

  const onSubmitCapture = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    const next: Record<string, string> = {};
    for (const el of Array.from(e.currentTarget.elements)) {
      if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement)) continue;
      if (!el.name || (el instanceof HTMLInputElement && ["password", "file", "hidden", "submit"].includes(el.type))) continue;
      next[el.name] = el.value;
    }
    typed.current = next;
  }, []);

  useEffect(() => {
    const form = ref.current;
    if (!form || !state?.error) return;
    for (const [name, value] of Object.entries(typed.current)) {
      const el = form.elements.namedItem(name);
      if ((el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) && el.value !== value) el.value = value;
    }
  }, [state]);

  return { ref, onSubmitCapture };
}
