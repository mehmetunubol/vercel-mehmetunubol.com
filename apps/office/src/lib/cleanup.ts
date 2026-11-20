import { lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { messages } from "@/lib/db/schema";

let lastRun = 0;

/** Hard-deletes expired messages. Reads also filter on expires_at, so this is housekeeping. */
export async function deleteExpiredMessages(force = false) {
  const now = Date.now();
  if (!force && now - lastRun < 60_000) return;
  lastRun = now;
  await db.delete(messages).where(lt(messages.expiresAt, sql`now()`));
}
