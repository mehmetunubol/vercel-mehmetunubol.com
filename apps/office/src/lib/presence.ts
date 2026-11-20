import { and, eq, isNotNull, lte, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

/** Turns scheduled changes whose time has come into the actual status. */
export async function applyDuePlans(userId?: string) {
  const conditions: SQL[] = [isNotNull(users.plannedAt), lte(users.plannedAt, sql`now()`)];
  if (userId) conditions.push(eq(users.id, userId));
  await db
    .update(users)
    .set({
      presence: sql`coalesce(${users.plannedPresence}, ${users.presence})`,
      presenceUpdatedAt: sql`${users.plannedAt}`,
      plannedPresence: null,
      plannedAt: null,
      plannedPrecision: null,
    })
    .where(and(...conditions));
}
