import type { Metadata } from "next";
import { signOut } from "@/auth";
import { AppShell } from "@/components/app-nav";
import { requireUser } from "@/server/session";

export const metadata: Metadata = {
  title: { default: "Workspace", template: "%s | ADL" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <AppShell
      role={user.role}
      name={user.name ?? user.email}
      email={user.email}
      signOutAction={logout}
    >
      {children}
    </AppShell>
  );
}
