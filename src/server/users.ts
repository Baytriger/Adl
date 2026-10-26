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

export async function getUserByEmail(email: string) {
  const [row] = await db.select().from(users).where(eq(users.email, normalizeEmail(email))).limit(1);
  return row;
}

export async function userCount(): Promise<number> {
  const [row] = await db.select({ n: count() }).from(users);
  return Number(row?.n ?? 0);
}

/** First-run setup is open only while nobody can sign in yet, and an admin email has been configured. */
export async function setupAvailable(): Promise<boolean> {
  const [row] = await db.select({ n: count() }).from(users).where(isNotNull(users.passwordHash));
  const withPassword = Number(row?.n ?? 0);
  return withPassword === 0 && adminEmails().length > 0;
}

export async function recordLogin(email: string) {
  await db.update(users).set({ lastLogin: new Date() }).where(eq(users.email, email));
  await db.insert(auditLog).values({ actor: email, action: "auth.sign_in" });
}

export const ROLE_RANK: Record<Role, number> = { viewer: 1, editor: 2, admin: 3 };

export function hasRole(actual: Role | undefined, needed: Role): boolean {
  return !!actual && ROLE_RANK[actual] >= ROLE_RANK[needed];
}
