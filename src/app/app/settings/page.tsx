import type { Metadata } from "next";
import { requireUser } from "@/server/session";
import { PageHeader, Panel } from "@/components/ui";
import { ThemeToggle } from "@/components/theme";
import { PasswordForm } from "@/components/password-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const hours = Number(process.env.ADL_SESSION_HOURS ?? 8);
  return (
    <>
      <PageHeader title="Settings" description="Your profile, appearance and session." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Profile">
          <dl className="space-y-3 text-sm">
            <div><dt className="text-muted">Name</dt><dd className="font-medium">{user.name ?? "Not set"}</dd></div>
            <div><dt className="text-muted">Email</dt><dd className="font-medium">{user.email}</dd></div>
            <div><dt className="text-muted">Role</dt><dd className="font-medium capitalize">{user.role}</dd></div>
          </dl>
          <p className="mt-4 text-xs text-muted">To change your name or email, ask an admin.</p>
        </Panel>
        <Panel title="Appearance">
          <div className="flex items-center justify-between gap-4 text-sm">
            <p>Switch between light and dark. Your choice is remembered on this device.</p>
            <ThemeToggle />
          </div>
        </Panel>
        <Panel title="Change password">
          <PasswordForm />
        </Panel>
        <Panel title="Session">
          <p className="text-sm">
            You&apos;re signed out automatically after <span className="tnum font-medium">{hours}</span> hours. Use <span className="font-medium">Sign out</span> in the sidebar when you&apos;re on a shared device.
          </p>
        </Panel>
      </div>
    </>
  );
}
