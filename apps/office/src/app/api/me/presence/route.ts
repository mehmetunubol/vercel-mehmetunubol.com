import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { MAX_PLAN_DAYS, opposite } from "@/lib/plan";
import { applyDuePlans } from "@/lib/presence";
import { badRequest, getCurrentUser, unauthorized } from "@/lib/session";
import { presenceSchema } from "@/lib/validation";

/**
 * Sets the caller's status and/or schedules a change to the opposite status.
 *   { presence: "out" }                          → out now (clears any plan)
 *   { plan: { at, precision } }                  → keep status, schedule the opposite
 *   { presence: "out", plan: { at, precision } } → out now, back at `at`
 *   { plan: null }                               → cancel the scheduled change
 */
export async function POST(request: Request) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  const parsed = presenceSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest("invalid presence update");
  const { presence, plan } = parsed.data;

  await applyDuePlans(me.id);
  const [current] = await db
    .select({ presence: users.presence })
    .from(users)
    .where(eq(users.id, me.id));
  const now = new Date();
  const next = presence ?? current!.presence;

  const update: Partial<typeof users.$inferInsert> = {};
  if (presence) {
    update.presence = presence;
    update.presenceUpdatedAt = now;
  }
  if (plan) {
    const at = new Date(plan.at);
    if (at <= now) return badRequest("That time has already passed.");
    if (at.getTime() - now.getTime() > MAX_PLAN_DAYS * 86_400_000) {
      return badRequest(`Pick a time within ${MAX_PLAN_DAYS} days.`);
    }
    update.plannedPresence = opposite(next);
    update.plannedAt = at;
    update.plannedPrecision = plan.precision;
  } else if (plan === null || presence) {
    // A manual change makes an earlier plan meaningless.
    update.plannedPresence = null;
    update.plannedAt = null;
    update.plannedPrecision = null;
  }

  const [saved] = await db.update(users).set(update).where(eq(users.id, me.id)).returning({
    presence: users.presence,
    presenceUpdatedAt: users.presenceUpdatedAt,
    plannedPresence: users.plannedPresence,
    plannedAt: users.plannedAt,
    plannedPrecision: users.plannedPrecision,
  });
  return Response.json(saved);
}
