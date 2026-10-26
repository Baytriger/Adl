"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "./db";
import { LEVELS, ROLES } from "./db/schema";
import { AuthError } from "next-auth";
import { auth, signIn } from "@/auth";
import { getUserOrNull } from "./session";
import { hashPassword, passwordProblem, temporaryPassword, verifyPassword } from "./password";
import { LOCK_MINUTES, clearFailures, isLocked, recordFailure } from "./rate-limit";
import { adminEmails, getUserByEmail, normalizeEmail, setupAvailable } from "./users";
import { DATASETS, analyze, parseTable, rowKey, type DatasetKey, type EventRow, type MediaRow, type MemberRow } from "@/lib/import";
import { describeCheck, loadExisting, readUpload } from "./upload";

const { members, events, mediaPages, importRuns, auditLog, users } = schema;

export type FormState = { ok?: string; error?: string; details?: string[]; checked?: boolean } | null;

const DENIED: FormState = { error: "You don't have permission to do that." };
const BAD_INPUT = (e: z.ZodError): FormState => ({
  error: e.issues[0] ? `${e.issues[0].path.join(".") || "Form"}: ${e.issues[0].message}` : "Check the form and try again.",
});

async function audit(actor: string, action: string, target?: string, detail?: string) {
  await db.insert(auditLog).values({ actor, action, target, detail });
}

/** Postgres unique-violation (code 23505), whether or not the driver wrapped the error. */
function isUnique(e: unknown): boolean {
  const code = (e as { code?: string })?.code ?? (e as { cause?: { code?: string } })?.cause?.code;
  return code === "23505";
}
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");

/* ---------- Members ---------- */
const memberForm = z.object({
  full_name: z.string().trim().min(1).max(120),
  email: z.union([z.literal(""), z.email().max(200)]).transform((v) => v || null),
  region: z.string().trim().min(1).max(80),
  level: z.enum(LEVELS),
  joined_at: z.coerce.date(),
});

export async function addMember(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getUserOrNull("editor");
  if (!user) return DENIED;
  const p = memberForm.safeParse(Object.fromEntries(fd));
  if (!p.success) return BAD_INPUT(p.error);
  try {
    await db
      .insert(members)
      .values({ fullName: p.data.full_name, email: p.data.email, region: p.data.region, level: p.data.level, joinedAt: p.data.joined_at });
  } catch (e) {
    if (isUnique(e)) return { error: "A member with that email already exists." };
    throw e;
  }
  await audit(user.email, "member.create", p.data.full_name);
  revalidatePath("/app", "layout");
  return { ok: `Added ${p.data.full_name}.` };
}

export async function deleteMember(fd: FormData) {
  const user = await getUserOrNull("editor");
  if (!user) return;
  const id = str(fd, "id");
  await db.delete(members).where(eq(members.id, id));
  await audit(user.email, "member.delete", id);
  revalidatePath("/app", "layout");
}

/* ---------- Events ---------- */
const eventForm = z
  .object({
    title: z.string().trim().min(1).max(160),
    starts_at: z.coerce.date(),
    region: z.string().trim().max(80).transform((v) => v || null),
    turned_up: z.coerce.number().int().min(0).max(100_000_000),
    participated: z.coerce.number().int().min(0).max(100_000_000),
  })
  .refine((v) => v.participated <= v.turned_up, {
    message: "participated cannot be greater than turned up",
    path: ["participated"],
  });

export async function addEvent(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getUserOrNull("editor");
  if (!user) return DENIED;
  const p = eventForm.safeParse(Object.fromEntries(fd));
  if (!p.success) return BAD_INPUT(p.error);
  await db
    .insert(events)
    .values({ title: p.data.title, startsAt: p.data.starts_at, region: p.data.region, turnedUp: p.data.turned_up, participated: p.data.participated });
  await audit(user.email, "event.create", p.data.title);
  revalidatePath("/app", "layout");
  return { ok: `Added ${p.data.title}.` };
}

export async function deleteEvent(fd: FormData) {
  const user = await getUserOrNull("editor");
  if (!user) return;
  const id = str(fd, "id");
  await db.delete(events).where(eq(events.id, id));
  await audit(user.email, "event.delete", id);
  revalidatePath("/app", "layout");
}

/* ---------- Media pages ---------- */
const mediaForm = z.object({
  platform: z.string().trim().min(1).max(40).transform((v) => v.toLowerCase()),
  handle: z.string().trim().min(1).max(120),
  url: z.union([z.literal(""), z.url().max(300)]).transform((v) => v || null),
  followers: z.coerce.number().int().min(0).max(100_000_000),
  posts: z.coerce.number().int().min(0).max(100_000_000),
});

export async function saveMediaPage(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getUserOrNull("editor");
  if (!user) return DENIED;
  const p = mediaForm.safeParse(Object.fromEntries(fd));
  if (!p.success) return BAD_INPUT(p.error);
  await db
    .insert(mediaPages)
    .values({ ...p.data, recordedAt: new Date() })
    .onConflictDoUpdate({
      target: [mediaPages.platform, mediaPages.handle],
      set: { url: p.data.url, followers: p.data.followers, posts: p.data.posts, recordedAt: new Date() },
    });
  await audit(user.email, "media.save", `${p.data.platform}:${p.data.handle}`);
  revalidatePath("/app", "layout");
  return { ok: `Saved ${p.data.platform} page ${p.data.handle}.` };
}

export async function deleteMediaPage(fd: FormData) {
  const user = await getUserOrNull("editor");
  if (!user) return;
  const id = str(fd, "id");
  await db.delete(mediaPages).where(eq(mediaPages.id, id));
  await audit(user.email, "media.delete", id);
  revalidatePath("/app", "layout");
}

/* ---------- CSV / Excel import ---------- */
export async function importCsv(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getUserOrNull("editor");
  if (!user) return DENIED;
  const dataset = str(fd, "dataset") as DatasetKey;
  if (!DATASETS.includes(dataset)) return { error: "Choose a dataset." };
  const file = fd.get("file");
  if (!(file instanceof File)) return { error: "Choose a CSV or Excel (.xlsx) file to upload." };

  const startedAt = new Date();
  const upload = await readUpload(file);
  if ("error" in upload) return { error: upload.error };
  const result = parseTable(dataset, upload.table);
  const existing = await loadExisting(dataset);
  const analysis = analyze(dataset, result.rows, result.rowNums, existing);

  if (str(fd, "mode") === "check") {
    const { headline, lines } = describeCheck(dataset, result, analysis, upload.note);
    if (result.rows.length === 0 && result.errors.length > 0) {
      return { error: "This file can't be imported as it is.", details: lines, checked: true };
    }
    return { ok: headline, details: lines, checked: true };
  }

  const fatal = result.rows.length === 0 && result.errors.length > 0;
  let inserted = 0;
  let skipped = 0;

  if (!fatal) {
    // Members without an email have no database constraint, so skip anything already stored by key.
    const known = dataset === "media" ? null : existing.keys;
    await db.transaction(async (tx) => {
      for (let i = 0; i < result.rows.length; i++) {
        const row = result.rows[i];
        // Repeats inside the file were already resolved by the analysis.
        if (analysis.skipRows.has(result.rowNums[i])) {
          skipped++;
          continue;
        }
        if (dataset === "members") {
          const r = row as MemberRow;
          const key = rowKey("members", row);
          if (known!.has(key)) {
            skipped++;
            continue;
          }
          known!.add(key);
          const res = await tx
            .insert(members)
            .values({ fullName: r.full_name, email: r.email ?? null, region: r.region, level: r.level, joinedAt: r.joined_at })
            .onConflictDoNothing()
            .returning({ id: members.id });
          if (res.length) inserted++;
          else skipped++;
        } else if (dataset === "events") {
          const r = row as EventRow;
          const key = rowKey("events", row);
          if (known!.has(key)) {
            skipped++;
            continue;
          }
          known!.add(key);
          await tx
            .insert(events)
            .values({ title: r.title, startsAt: r.starts_at, region: r.region ?? null, turnedUp: r.turned_up, participated: r.participated });
          inserted++;
        } else {
          const r = row as MediaRow;
          await tx
            .insert(mediaPages)
            .values({ platform: r.platform, handle: r.handle, url: r.url ?? null, followers: r.followers, posts: r.posts, recordedAt: r.recorded_at })
            .onConflictDoUpdate({
              target: [mediaPages.platform, mediaPages.handle],
              set: { url: r.url ?? null, followers: r.followers, posts: r.posts, recordedAt: r.recorded_at },
            });
          inserted++;
        }
      }
    });
  }

  const status = fatal ? "failed" : result.errors.length ? "partial" : "success";
  await db
    .insert(importRuns)
    .values({
      dataset,
      startedAt,
      finishedAt: new Date(),
      status,
      rowsOk: inserted,
      rowsBad: result.errors.length,
      note: skipped ? `${skipped} duplicate row(s) skipped` : null,
      byEmail: user.email,
    });
  await audit(user.email, "import.run", dataset, `${status}: ${inserted} ok, ${skipped} skipped, ${result.errors.length} rejected`);
  revalidatePath("/app", "layout");

  const details = result.errors.slice(0, 20).map((e) => (e.row ? `Row ${e.row}: ${e.message}` : e.message));
  if (result.errors.length > 20) details.push(`…and ${result.errors.length - 20} more.`);
  if (fatal) return { error: "Nothing was imported.", details };
  return {
    checked: false,
    ok: `Imported ${inserted} row(s)${skipped ? `, skipped ${skipped} duplicate(s)` : ""}${result.errors.length ? `, rejected ${result.errors.length}` : ""}.`,
    details: details.length ? details : undefined,
  };
}

/* ---------- Team (admin only) ---------- */
const userForm = z.object({
  email: z.email().max(200).transform((v) => v.toLowerCase()),
  name: z.string().trim().max(120).transform((v) => v || null),
  role: z.enum(ROLES),
});

export async function addUser(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getUserOrNull("admin");
  if (!user) return DENIED;
  const p = userForm.safeParse(Object.fromEntries(fd));
  if (!p.success) return BAD_INPUT(p.error);
  // Blank means "generate one". An admin-chosen password is temporary too.
  const chosen = str(fd, "password");
  if (chosen) {
    const problem = passwordProblem(chosen);
    if (problem) return { error: `Password: ${problem}` };
  }
  const password = chosen || temporaryPassword();
  try {
    await db.insert(users).values({ ...p.data, passwordHash: await hashPassword(password), mustChange: true });
  } catch (e) {
    if (isUnique(e)) return { error: "That email already has an account." };
    throw e;
  }
  await audit(user.email, "user.add", p.data.email, p.data.role);
  revalidatePath("/app/team");
  return {
    ok: `${p.data.email} can sign in as ${p.data.role}. Send them this temporary password privately. It is shown only once, and they must replace it when they first sign in.`,
    details: [password],
  };
}

export async function resetPassword(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getUserOrNull("admin");
  if (!user) return DENIED;
  const [target] = await db.select().from(users).where(eq(users.id, str(fd, "id"))).limit(1);
  if (!target) return { error: "That person no longer exists." };
  if (target.email === user.email) return { error: "Change your own password under Settings." };
  const password = temporaryPassword();
  await db.update(users).set({ passwordHash: await hashPassword(password), mustChange: true }).where(eq(users.id, target.id));
  await audit(user.email, "user.reset_password", target.email);
  revalidatePath("/app/team");
  return { ok: `New temporary password for ${target.email}. Shown only once:`, details: [password] };
}

/* ---------- Passwords and first-run setup ---------- */
export async function signInWithPassword(_: FormState, fd: FormData): Promise<FormState> {
  try {
    await signIn("credentials", { email: str(fd, "email"), password: str(fd, "password"), redirectTo: "/app" });
    return null;
  } catch (e) {
    if (e instanceof AuthError) {
      if ((e as { code?: string }).code === "TooManyAttempts") {
        return { error: `Too many failed attempts. Try again in ${LOCK_MINUTES} minutes.` };
      }
      // One message for wrong email, wrong password and disabled accounts, so it reveals nothing.
      return { error: "That email and password don't match an active account." };
    }
    throw e; // Next's redirect is thrown as an error and must pass through.
  }
}

export async function changePassword(_: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  const email = session?.user?.email;
  const me = email ? await getUserByEmail(email) : undefined;
  if (!me || !me.active || !me.passwordHash) return { error: "Your session has ended. Sign in again." };

  const current = str(fd, "current");
  const next = str(fd, "next");
  if (next !== str(fd, "confirm")) return { error: "The new passwords don't match." };
  const problem = passwordProblem(next);
  if (problem) return { error: `New password: ${problem}` };
  if (next === current) return { error: "Choose a password different from the current one." };

  const key = `change:${me.email}`;
  if (isLocked(key)) return { error: `Too many attempts. Try again in ${LOCK_MINUTES} minutes.` };
  if (!(await verifyPassword(current, me.passwordHash))) {
    recordFailure(key);
    return { error: "The current password is wrong." };
  }
  clearFailures(key);
  await db.update(users).set({ passwordHash: await hashPassword(next), mustChange: false }).where(eq(users.id, me.id));
  await audit(me.email, "user.change_password");
  if (str(fd, "forced") === "1") redirect("/app");
  return { ok: "Password changed." };
}

/** The very first account. Only works while nobody has a password, and only for an email in ADL_ADMIN_EMAILS. */
export async function createFirstAdmin(_: FormState, fd: FormData): Promise<FormState> {
  const email = normalizeEmail(str(fd, "email"));
  const name = str(fd, "name").trim().slice(0, 120) || null;
  const password = str(fd, "password");
  if (!(await setupAvailable())) return { error: "Setup is already done. Sign in instead." };
  if (!adminEmails().includes(email)) return { error: "That email isn't on the admin list for this server." };
  if (password !== str(fd, "confirm")) return { error: "The passwords don't match." };
  const problem = passwordProblem(password);
  if (problem) return { error: `Password: ${problem}` };

  const hash = await hashPassword(password);
  await db.transaction(async (tx) => {
    const [existing] = await tx.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing) await tx.update(users).set({ passwordHash: hash, mustChange: false, role: "admin", active: true, name: name ?? existing.name }).where(eq(users.id, existing.id));
    else await tx.insert(users).values({ email, name, role: "admin", passwordHash: hash, mustChange: false });
  });
  await audit(email, "user.bootstrap_admin", email);
  await signIn("credentials", { email, password, redirectTo: "/app" });
  return null;
}

export async function updateUser(fd: FormData) {
  const user = await getUserOrNull("admin");
  if (!user) return;
  const id = str(fd, "id");
  const role = z.enum(ROLES).safeParse(str(fd, "role"));
  const active = str(fd, "active") === "true";
  if (!role.success) return;
  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!target) return;
  // Never let the last admin lock everyone out, or an admin demote themselves by accident.
  if (target.email === user.email && (role.data !== "admin" || !active)) return;
  await db.update(users).set({ role: role.data, active }).where(eq(users.id, id));
  await audit(user.email, "user.update", target.email, `role=${role.data} active=${active}`);
  revalidatePath("/app/team");
}
