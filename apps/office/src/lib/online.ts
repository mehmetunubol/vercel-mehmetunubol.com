import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

/** How long a check-in keeps someone "online" if the app stops checking in. */
// Longer than the slowest idle check (30 s), so an idle but open app stays "online".
export const ONLINE_WINDOW_SECONDS = 75;
/** How long a "typing…" signal lasts. */
export const TYPING_SECONDS = 6;

/**
 * Records that the user has the app open. The app checks in every 5–30 s while
 * on screen (slower when idle); the write only happens when the online window
 * is running low, so it's about one small update every 25 s per active user.
 */
export async function heartbeat(userId: string) {
  await db
    .update(users)
    .set({
      onlineUntil: sql`now() + make_interval(secs => ${ONLINE_WINDOW_SECONDS})`,
      lastSeenAt: sql`now()`,
    })
    .where(
      and(
        eq(users.id, userId),
        or(
          isNull(users.onlineUntil),
          lt(users.onlineUntil, sql`now() + make_interval(secs => 50)`),
        ),
      ),
    );
}

/** The app went to the background or closed: offline now, last seen now. */
export async function markAway(userId: string) {
  await db
    .update(users)
    .set({ onlineUntil: sql`now()`, lastSeenAt: sql`now()` })
    .where(eq(users.id, userId));
}
