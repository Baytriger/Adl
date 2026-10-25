import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme";
import { PasswordForm } from "@/components/password-form";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const session = await auth();
  if (!session?.user?.role) redirect("/sign-in");
  if (!session.user.mustChange) redirect("/app/settings");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" aria-label="ADL home"><Logo /></Link>
        <ThemeToggle />
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 pb-16 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
        <p className="mt-2 text-sm text-muted">You signed in with a temporary password. Replace it with one only you know before you continue.</p>
        <div className="mt-6"><PasswordForm forced /></div>
      </main>
    </div>
  );
}
