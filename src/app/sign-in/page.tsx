import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { setupAvailable } from "@/server/users";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme";
import { SetupForm, SignInForm } from "@/components/sign-in-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to the ADL workspace with your email and password.",
  alternates: { canonical: "/sign-in" },
};

export const dynamic = "force-dynamic";

const MESSAGES: Record<string, { title: string; body: string }> = {
  AccessDenied: {
    title: "This account doesn't have access",
    body: "Your access was removed or the account is disabled. Ask an ADL admin if this is a mistake.",
  },
  SessionExpired: {
    title: "Your session ended",
    body: "For your security you were signed out. Sign in again to continue.",
  },
  Configuration: {
    title: "Sign-in isn't set up correctly",
    body: "The server configuration for sign-in has a problem. An administrator needs to check it.",
  },
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await auth();
  if (session?.user?.role) redirect("/app");

  const { error } = await searchParams;
  const message = error ? (MESSAGES[error] ?? MESSAGES.Configuration) : null;
  const setup = await setupAvailable();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" aria-label="ADL home">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 pb-16 sm:px-6">
        {setup ? (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">Set up ADL</h1>
            <p className="mt-2 text-sm text-muted">Create the first admin account. After this, you add everyone else from the Team page.</p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">Sign in to ADL</h1>
            <p className="mt-2 text-sm text-muted">Use the email and password an ADL admin gave you.</p>
          </>
        )}

        {message && (
          <div role="alert" className="mt-6 rounded-ui border border-danger/40 bg-danger-soft p-4 text-sm">
            <p className="font-medium text-danger">{message.title}</p>
            <p className="mt-1 text-text">{message.body}</p>
          </div>
        )}

        {setup ? <SetupForm /> : <SignInForm />}
      </main>
    </div>
  );
}
