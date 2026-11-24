import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import {
  DEFAULT_MESSAGE_TTL_HOURS,
  MAX_MESSAGE_TTL_HOURS,
  MIN_MESSAGE_TTL_HOURS,
} from "@/lib/constants";

export function clampTtlHours(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_MESSAGE_TTL_HOURS;
  return Math.min(MAX_MESSAGE_TTL_HOURS, Math.max(MIN_MESSAGE_TTL_HOURS, Math.round(value)));
}

export async function getMessageTtlHours(): Promise<number> {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, "message_ttl_hours"))
    .limit(1);
  return row ? clampTtlHours(Number(row.value)) : DEFAULT_MESSAGE_TTL_HOURS;
}

export async function setMessageTtlHours(hours: number) {
  const value = String(clampTtlHours(hours));
  await db
    .insert(settings)
    .values({ key: "message_ttl_hours", value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
}

async function getSetting(key: string) {
  const [row] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return row?.value ?? null;
}

async function setSetting(key: string, value: string) {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
}

/** Panic switch: when on, nobody but the admin can sign in. */
export async function getLoginsDisabled() {
  return (await getSetting("logins_disabled")) === "true";
}

export async function setLoginsDisabled(disabled: boolean) {
  await setSetting("logins_disabled", disabled ? "true" : "false");
}

/** Admin switch: ordinary photos (kept in the chat). One-time photos are always allowed. */
export async function getPhotosAllowed() {
  return (await getSetting("photos_allowed")) === "true";
}

export async function setPhotosAllowed(allowed: boolean) {
  await setSetting("photos_allowed", allowed ? "true" : "false");
}
