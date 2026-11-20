"use server";

import { hash } from "bcryptjs";
import { and, eq, inArray, like, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { conversationMembers, conversations, users } from "@/lib/db/schema";
import { ADMIN_USERNAME, MIN_PASSWORD_LENGTH, USERNAME_PATTERN } from "@/lib/constants";
import { getCurrentUser } from "@/lib/session";
import { setMessageTtlHours } from "@/lib/settings";

export type ActionResult = { ok: true; message?: string } | { ok: false; message: string };

async function requireAdmin() {
  const me = await getCurrentUser();
  if (!me?.isAdmin) throw new Error("Not authorized");
  return me;
}

function done(message?: string): ActionResult {
  revalidatePath("/admin");
  return { ok: true, message };
}

const passwordField = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
  .max(200);

export async function createUser(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = z
    .object({
      username: z
        .string()
        .trim()
        .toLowerCase()
        .regex(USERNAME_PATTERN, "Username: 3–32 chars, a–z, 0–9, dot, dash, underscore."),
      displayName: z.string().trim().min(1, "Display name is required.").max(64),
      password: passwordField,
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]!.message };

  const inserted = await db
    .insert(users)
    .values({
      username: parsed.data.username,
      displayName: parsed.data.displayName,
      passwordHash: await hash(parsed.data.password, 12),
    })
    .onConflictDoNothing()
    .returning({ id: users.id });
  if (!inserted.length) return { ok: false, message: `"${parsed.data.username}" already exists.` };
  return done(`Added ${parsed.data.displayName}.`);
}

export async function renameUser(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = z
    .object({ userId: z.uuid(), displayName: z.string().trim().min(1).max(64) })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "Display name is required." };
  await db
    .update(users)
    .set({ displayName: parsed.data.displayName })
    .where(eq(users.id, parsed.data.userId));
  return done("Saved.");
}

/**
 * Sets a new password chosen by the admin. The old encrypted key can't be
 * re-wrapped without the old password, so the user gets a fresh key pair on
 * next sign-in and can't read messages sent to them before the reset.
 */
export async function resetPassword(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = z
    .object({ userId: z.uuid(), password: passwordField })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]!.message };
  await db
    .update(users)
    .set({
      passwordHash: await hash(parsed.data.password, 12),
      publicKey: null,
      encryptedPrivateKey: null,
      failedLogins: 0,
      lockedUntil: null,
      tokenVersion: sql`${users.tokenVersion} + 1`,
    })
    .where(eq(users.id, parsed.data.userId));
  return done("Password reset. They've been signed out everywhere.");
}

export async function deleteUser(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const me = await requireAdmin();
  const userId = z.uuid().safeParse(form.get("userId"));
  if (!userId.success) return { ok: false, message: "Unknown user." };
  const [target] = await db.select().from(users).where(eq(users.id, userId.data)).limit(1);
  if (!target) return { ok: false, message: "Unknown user." };
  if (target.username === ADMIN_USERNAME || target.id === me.id) {
    return { ok: false, message: "The admin account can't be deleted." };
  }
  // Their private chats go with them; group memberships and messages cascade.
  await db
    .delete(conversations)
    .where(
      and(
        eq(conversations.kind, "direct"),
        or(
          like(conversations.directKey, `${target.id}:%`),
          like(conversations.directKey, `%:${target.id}`),
        ),
      ),
    );
  await db.delete(users).where(eq(users.id, target.id));
  return done(`Removed ${target.displayName}.`);
}

const groupSchema = z.object({
  name: z.string().trim().min(1, "Group name is required.").max(64),
  memberIds: z.array(z.uuid()).min(1, "Pick at least one member."),
});

function readGroup(form: FormData) {
  return groupSchema.safeParse({ name: form.get("name"), memberIds: form.getAll("memberIds") });
}

export async function createGroup(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = readGroup(form);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]!.message };
  const [group] = await db
    .insert(conversations)
    .values({ kind: "group", name: parsed.data.name })
    .returning({ id: conversations.id });
  await db
    .insert(conversationMembers)
    .values(parsed.data.memberIds.map((userId) => ({ conversationId: group!.id, userId })))
    .onConflictDoNothing();
  return done(`Created ${parsed.data.name}.`);
}

export async function updateGroup(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const groupId = z.uuid().safeParse(form.get("groupId"));
  const parsed = readGroup(form);
  if (!groupId.success) return { ok: false, message: "Unknown group." };
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]!.message };

  const id = groupId.data;
  await db
    .update(conversations)
    .set({ name: parsed.data.name })
    .where(and(eq(conversations.id, id), eq(conversations.kind, "group")));
  const current = await db
    .select({ userId: conversationMembers.userId })
    .from(conversationMembers)
    .where(eq(conversationMembers.conversationId, id));
  const wanted = new Set(parsed.data.memberIds);
  const removed = current.map((m) => m.userId).filter((uid) => !wanted.has(uid));
  if (removed.length) {
    await db
      .delete(conversationMembers)
      .where(
        and(
          eq(conversationMembers.conversationId, id),
          inArray(conversationMembers.userId, removed),
        ),
      );
  }
  await db
    .insert(conversationMembers)
    .values(parsed.data.memberIds.map((userId) => ({ conversationId: id, userId })))
    .onConflictDoNothing();
  return done("Group saved.");
}

export async function deleteGroup(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const groupId = z.uuid().safeParse(form.get("groupId"));
  if (!groupId.success) return { ok: false, message: "Unknown group." };
  await db
    .delete(conversations)
    .where(and(eq(conversations.id, groupId.data), eq(conversations.kind, "group")));
  return done("Group deleted.");
}

export async function saveSettings(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const hours = Number(form.get("ttlHours"));
  if (!Number.isFinite(hours) || hours <= 0)
    return { ok: false, message: "Enter a number of hours." };
  await setMessageTtlHours(hours);
  return done("Saved. Applies to new messages.");
}
