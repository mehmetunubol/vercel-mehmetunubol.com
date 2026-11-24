"use server";

import { hash } from "bcryptjs";
import { and, eq, inArray, like, ne, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { conversationMembers, conversations, messages, users } from "@/lib/db/schema";
import { ADMIN_USERNAME, MIN_PASSWORD_LENGTH, USERNAME_PATTERN } from "@/lib/constants";
import { getCurrentUser } from "@/lib/session";
import { markAllAlertsSeen } from "@/lib/security";
import { setLoginsDisabled, setMessageTtlHours, setPhotosAllowed } from "@/lib/settings";
import { logAdmin } from "@/lib/admin-log";
import { unblockIp } from "@/lib/guessing";
import { events } from "@/lib/db/schema";

export type ActionResult = { ok: true; message?: string } | { ok: false; message: string };

async function requireAdmin() {
  const me = await getCurrentUser();
  if (!me?.isAdmin) throw new Error("Not authorized");
  return me;
}

/** "Ayşe Demir (@ayse)" for the activity log. */
async function who(userId: string) {
  const [u] = await db
    .select({ displayName: users.displayName, username: users.username })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return u ? `${u.displayName} (@${u.username})` : "an unknown user";
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
  await logAdmin("user.created", `Added ${parsed.data.displayName} (@${parsed.data.username})`);
  return done(`Added ${parsed.data.displayName}.`);
}

export async function renameUser(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = z
    .object({ userId: z.uuid(), displayName: z.string().trim().min(1).max(64) })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "Display name is required." };
  const before = await who(parsed.data.userId);
  await db
    .update(users)
    .set({ displayName: parsed.data.displayName })
    .where(eq(users.id, parsed.data.userId));
  await logAdmin("user.renamed", `Renamed ${before} to ${parsed.data.displayName}`);
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
  await logAdmin("user.password_reset", `Reset the password of ${await who(parsed.data.userId)}`);
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
  await logAdmin("user.deleted", `Removed ${target.displayName} (@${target.username})`);
  return done(`Removed ${target.displayName}.`);
}

const groupSchema = z.object({
  name: z.string().trim().min(1, "Group name is required.").max(64),
  memberIds: z.array(z.uuid()).min(1, "Pick at least one member."),
});

/**
 * Reads the group form. An announcement group always includes the admin,
 * who is the only one allowed to post in it.
 */
async function readGroup(form: FormData) {
  const me = await requireAdmin();
  const announcement = form.get("announcement") === "on";
  const memberIds = form.getAll("memberIds").map(String);
  if (announcement && !memberIds.includes(me.id)) memberIds.push(me.id);
  const parsed = groupSchema.safeParse({ name: form.get("name"), memberIds });
  return parsed.success ? { ...parsed, data: { ...parsed.data, announcement } } : parsed;
}

export async function createGroup(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const parsed = await readGroup(form);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]!.message };
  const [group] = await db
    .insert(conversations)
    .values({ kind: "group", name: parsed.data.name, announcement: parsed.data.announcement })
    .returning({ id: conversations.id });
  await db
    .insert(conversationMembers)
    .values(parsed.data.memberIds.map((userId) => ({ conversationId: group!.id, userId })))
    .onConflictDoNothing();
  await logAdmin(
    "group.created",
    `Created ${parsed.data.announcement ? "announcement group" : "group"} "${parsed.data.name}" with ${parsed.data.memberIds.length} members`,
  );
  return done(`Created ${parsed.data.name}.`);
}

export async function updateGroup(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const groupId = z.uuid().safeParse(form.get("groupId"));
  const parsed = await readGroup(form);
  if (!groupId.success) return { ok: false, message: "Unknown group." };
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]!.message };

  const id = groupId.data;
  await db
    .update(conversations)
    .set({ name: parsed.data.name, announcement: parsed.data.announcement })
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
  await logAdmin(
    "group.updated",
    `Updated ${parsed.data.announcement ? "announcement group" : "group"} "${parsed.data.name}" (${parsed.data.memberIds.length} members)`,
  );
  return done("Group saved.");
}

export async function deleteGroup(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const groupId = z.uuid().safeParse(form.get("groupId"));
  if (!groupId.success) return { ok: false, message: "Unknown group." };
  const [group] = await db
    .select({ name: conversations.name })
    .from(conversations)
    .where(eq(conversations.id, groupId.data))
    .limit(1);
  await db
    .delete(conversations)
    .where(and(eq(conversations.id, groupId.data), eq(conversations.kind, "group")));
  await logAdmin("group.deleted", `Deleted group "${group?.name ?? "unknown"}" and its messages`);
  return done("Group deleted.");
}

export async function saveSettings(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const hours = Number(form.get("ttlHours"));
  if (!Number.isFinite(hours) || hours <= 0)
    return { ok: false, message: "Enter a number of hours." };
  await setMessageTtlHours(hours);
  await logAdmin("settings.message_ttl", `Set message lifetime to ${Math.round(hours)} hours`);
  return done("Saved. Applies to new messages.");
}

/** Lets a locked-out user straight back in. */
export async function unlockUser(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const userId = z.uuid().safeParse(form.get("userId"));
  if (!userId.success) return { ok: false, message: "Unknown user." };
  await db
    .update(users)
    .set({ failedLogins: 0, lockedUntil: null })
    .where(eq(users.id, userId.data));
  await logAdmin("user.unlocked", `Unlocked ${await who(userId.data)}`);
  return done("Unlocked.");
}

export async function markAlertsSeen(): Promise<ActionResult> {
  await requireAdmin();
  await markAllAlertsSeen();
  return done();
}

/** Panic button: deletes every message in every conversation. */
export async function purgeAllMessages(): Promise<ActionResult> {
  await requireAdmin();
  const deleted = await db.delete(messages).returning({ id: messages.id });
  await logAdmin("panic.messages_deleted", `Deleted all messages (${deleted.length})`);
  return done(`Deleted ${deleted.length} ${deleted.length === 1 ? "message" : "messages"}.`);
}

/** Panic button: deletes every event, past and upcoming. */
export async function purgeAllEvents(): Promise<ActionResult> {
  await requireAdmin();
  const deleted = await db.delete(events).returning({ id: events.id });
  await logAdmin("panic.events_deleted", `Deleted all events (${deleted.length})`);
  return done(`Deleted ${deleted.length} ${deleted.length === 1 ? "event" : "events"}.`);
}

/**
 * Panic button: blocks sign-in for everyone but the admin and signs them all
 * out now. They see the ordinary "account locked" message.
 */
export async function setSignInsDisabled(disabled: boolean): Promise<ActionResult> {
  const me = await requireAdmin();
  await setLoginsDisabled(disabled);
  if (disabled) {
    await db
      .update(users)
      .set({ tokenVersion: sql`${users.tokenVersion} + 1` })
      .where(ne(users.id, me.id));
  }
  await logAdmin(
    disabled ? "panic.signins_disabled" : "panic.signins_enabled",
    disabled ? "Disabled sign-ins and signed everyone else out" : "Enabled sign-ins again",
  );
  return done(
    disabled ? "Sign-ins disabled. Everyone else has been signed out." : "Sign-ins enabled again.",
  );
}

/** Ordinary photos (kept in the chat) on or off. One-time photos are always allowed. */
export async function savePhotoSettings(
  _: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const allowed = form.get("photosAllowed") === "on";
  await setPhotosAllowed(allowed);
  await logAdmin(
    "settings.photos",
    allowed ? "Allowed ordinary photos" : "Turned off ordinary photos",
  );
  return done(allowed ? "Ordinary photos are allowed." : "Only one-time photos can be sent now.");
}

/** Lets a blocked network address try signing in again right away. */
export async function unblockAddress(
  _: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const ip = String(form.get("ip") ?? "").slice(0, 64);
  if (!ip) return { ok: false, message: "Unknown address." };
  await unblockIp(ip);
  await logAdmin("security.unblocked", `Unblocked sign-ins from ${ip}`);
  return done("Unblocked.");
}
