import { lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { adminLog } from "@/lib/db/schema";

export const ADMIN_LOG_KEEP_DAYS = 90;

export async function logAdmin(action: string, detail?: string) {
  await db.insert(adminLog).values({ action, detail: detail?.slice(0, 300) ?? null });
}

export async function deleteOldAdminLog() {
  await db
    .delete(adminLog)
    .where(lt(adminLog.createdAt, sql`now() - make_interval(days => ${ADMIN_LOG_KEEP_DAYS})`));
}
