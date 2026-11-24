import { after } from "next/server";
import { and, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import webpush from "web-push";
import { db } from "@/lib/db";
import { pushSubscriptions, users } from "@/lib/db/schema";

/**
 * Web Push "nudges". Deliberately content-free: the server sends a push with
 * no payload at all, and the service worker (public/sw.js) shows a random,
 * generic line. Nothing about the app, the sender or the content reaches the
 * push service or the lock screen.
 */

// At most one nudge per device per minute, so a busy chat doesn't spam.
const MIN_GAP_SECONDS = 60;

export function pushPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || null;
}

function configure() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  // The subject is only seen by the push service, never by the user.
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:noreply@example.com",
    publicKey,
    privateKey,
  );
  return true;
}

async function send(userIds: string[]) {
  const requested = [...new Set(userIds)];
  if (!requested.length || !configure()) return;
  // Someone using the app right now sees the update there; don't buzz their phone.
  const online = await db
    .select({ id: users.id })
    .from(users)
    .where(and(inArray(users.id, requested), sql`${users.onlineUntil} > now()`));
  const onlineIds = new Set(online.map((u) => u.id));
  const unique = requested.filter((id) => !onlineIds.has(id));
  if (!unique.length) return;
  // Claim the devices that haven't had a nudge in the last minute, atomically,
  // so parallel requests don't double-send.
  const due = await db
    .update(pushSubscriptions)
    .set({ lastSentAt: sql`now()` })
    .where(
      and(
        inArray(pushSubscriptions.userId, unique),
        or(
          isNull(pushSubscriptions.lastSentAt),
          lt(pushSubscriptions.lastSentAt, sql`now() - make_interval(secs => ${MIN_GAP_SECONDS})`),
        ),
      ),
    )
    .returning();
  await Promise.all(
    due.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          null,
          { TTL: 60 * 60 * 12, urgency: "normal" },
        );
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        // The device unsubscribed or the subscription expired.
        if (status === 404 || status === 410) {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
        }
      }
    }),
  );
}

/** Nudges these users' devices after the response has been sent. */
export function notifyUsers(userIds: string[]) {
  if (!userIds.length) return;
  after(() => send(userIds).catch(() => {}));
}
