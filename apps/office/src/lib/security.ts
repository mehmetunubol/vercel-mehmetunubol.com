import { and, eq, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { securityAlerts, users } from "@/lib/db/schema";
import { ADMIN_USERNAME } from "@/lib/constants";
import { notifyUsers } from "@/lib/push";

export const ALERT_KEEP_DAYS = 30;

export async function recordLockout(userId: string) {
  await db.insert(securityAlerts).values({ kind: "lockout", userId });
  const [admin] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, ADMIN_USERNAME));
  if (admin) notifyUsers([admin.id]);
}

export async function unseenAlertCount() {
  const [row] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(securityAlerts)
    .where(isNull(securityAlerts.seenAt));
  return row?.n ?? 0;
}

export async function deleteOldAlerts() {
  await db
    .delete(securityAlerts)
    .where(lt(securityAlerts.createdAt, sql`now() - make_interval(days => ${ALERT_KEEP_DAYS})`));
}

export async function markAllAlertsSeen() {
  await db
    .update(securityAlerts)
    .set({ seenAt: sql`now()` })
    .where(and(isNull(securityAlerts.seenAt)));
}
