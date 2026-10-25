"use client";

import { buttonClass } from "@/components/button-styles";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-2 text-muted">
        We couldn&apos;t load this page. Nothing you entered was lost. Try again, and if it keeps happening, tell an admin.
      </p>
      <button type="button" onClick={reset} className={`${buttonClass("primary")} mt-6 w-fit`}>
        Try again
      </button>
    </main>
  );
}
