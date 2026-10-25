import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { buttonClass } from "@/components/button-styles";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <Logo />
      <p className="mt-10 text-sm font-medium text-accent">404</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">We can&apos;t find that page</h1>
      <p className="mt-2 text-muted">
        The address may be mistyped, or the page may have moved.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/" className={buttonClass("primary")}>Go to the homepage</Link>
        <Link href="/app" className={buttonClass("secondary")}>Open the workspace</Link>
      </div>
    </main>
  );
}
