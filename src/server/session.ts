import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Role } from "./db/schema";
import { hasRole } from "./users";

/** Server-side gate for pages, actions and route handlers. Never rely on hidden UI. */
export async function requireUser(needed: Role = "viewer") {
  const session = await auth();
  const user = session?.user;
  // No session at all: a normal first visit or an expired cookie. Don't claim it "ended".
  if (!session) redirect("/sign-in");
  // A session exists but its role is gone: access was removed or the account was disabled.
  if (!user?.email || !user.role) redirect("/sign-in?error=AccessDenied");
  // A temporary password must be replaced before anything else.
  if (user.mustChange) redirect("/change-password");
  if (!hasRole(user.role, needed)) redirect("/app/unauthorized");
  return { id: user.id!, email: user.email, name: user.name ?? null, role: user.role };
}

/** For route handlers and actions that should return an error instead of redirecting. */
export async function getUserOrNull(needed: Role = "viewer") {
  const session = await auth();
  const user = session?.user;
  if (!user?.email || !user.role || user.mustChange || !hasRole(user.role, needed)) return null;
  return { id: user.id!, email: user.email, name: user.name ?? null, role: user.role };
}
