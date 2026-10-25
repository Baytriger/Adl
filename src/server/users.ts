import "server-only";
import { count, eq, isNotNull } from "drizzle-orm";
import { db, schema } from "./db";
import type { Role } from "./db/schema";

const { users, auditLog } = schema;

export function adminEmails(): string[] {
  return (process.env.ADL_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export const normalizeEmail = (e: string) => e.trim().toLowerCase();

export function getUserByEmail(email: string) {
  return db.select().from(users).where(eq(users.email, normalizeEmail(email))).get();
}

export function userCount(): number {
  return db.select({ n: count() }).from(users).get()?.n ?? 0;
}

/** First-run setup is open only while nobody can sign in yet, and an admin email has been configured. */
export function setupAvailable(): boolean {
  const withPassword = db.select({ n: count() }).from(users).where(isNotNull(users.passwordHash)).get()?.n ?? 0;
  return withPassword === 0 && adminEmails().length > 0;
}

export function recordLogin(email: string) {
  db.update(users).set({ lastLogin: new Date() }).where(eq(users.email, email)).run();
  db.insert(auditLog).values({ actor: email, action: "auth.sign_in" }).run();
}

export const ROLE_RANK: Record<Role, number> = { viewer: 1, editor: 2, admin: 3 };

export function hasRole(actual: Role | undefined, needed: Role): boolean {
  return !!actual && ROLE_RANK[actual] >= ROLE_RANK[needed];
}
