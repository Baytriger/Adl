import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { db, schema } from "@/server/db";
import { verifyPassword } from "@/server/password";
import { LOCK_MINUTES, clearFailures, isLocked, recordFailure } from "@/server/rate-limit";
import { getUserByEmail, normalizeEmail, recordLogin } from "@/server/users";

const SESSION_MAX_AGE = Number(process.env.ADL_SESSION_HOURS ?? 8) * 3600;

class TooManyAttempts extends CredentialsSignin {
  code = "TooManyAttempts";
}

const credentialsSchema = z.object({ email: z.string().trim().min(3).max(200), password: z.string().min(1).max(200) });

async function audit(actor: string, action: string, detail?: string) {
  await db.insert(schema.auditLog).values({ actor, action, detail });
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw, request) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const email = normalizeEmail(parsed.data.email);
        const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

        if (isLocked(`email:${email}`) || isLocked(`ip:${ip}`, 30)) {
          await audit(email, "auth.locked", `More than 5 failed attempts. Try again in ${LOCK_MINUTES} minutes.`);
          throw new TooManyAttempts();
        }

        const user = await getUserByEmail(email);
        // Always run a password check, even for unknown emails, so timing is the same.
        const ok = await verifyPassword(parsed.data.password, user?.passwordHash);
        if (!user || !ok || !user.active) {
          recordFailure(`email:${email}`);
          recordFailure(`ip:${ip}`);
          await audit(email, "auth.failed");
          return null;
        }
        clearFailures(`email:${email}`);
        await recordLogin(user.email);
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE, updateAge: 15 * 60 },
  pages: { signIn: "/sign-in", error: "/sign-in" },
  trustHost: process.env.AUTH_TRUST_HOST === "true" || process.env.NODE_ENV !== "production",
  callbacks: {
    async jwt({ token, user }) {
      // Role and state are re-read from the database on every session check, so a disabled
      // account or a role change takes effect immediately.
      const email = (user?.email ?? token.email)?.toLowerCase();
      if (email) {
        const record = await getUserByEmail(email);
        const live = record?.active && record.passwordHash;
        token.role = live ? record.role : undefined;
        token.uid = live ? record.id : undefined;
        token.mustChange = live ? record.mustChange : undefined;
        token.name = record?.name ?? token.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (!token.role) {
        return { ...session, user: { ...session.user, role: undefined, id: undefined, mustChange: undefined } };
      }
      session.user.role = token.role as "admin" | "editor" | "viewer";
      session.user.id = token.uid as string;
      session.user.mustChange = Boolean(token.mustChange);
      return session;
    },
  },
});
