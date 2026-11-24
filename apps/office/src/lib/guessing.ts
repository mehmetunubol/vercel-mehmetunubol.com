import { and, eq, gt, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { securityAlerts, signInFailures, users } from "@/lib/db/schema";
import { ADMIN_USERNAME } from "@/lib/constants";
import { notifyUsers } from "@/lib/push";

/**
 * Limits password guessing per network address: after IP_FAILURE_LIMIT failed
 * sign-ins within IP_WINDOW_MINUTES, that address gets the ordinary "locked"
 * message for the rest of the window, whatever username it tries.
 * People behind one office network share an address, so the limit is generous.
 */
export const IP_WINDOW_MINUTES = 15;
export const IP_FAILURE_LIMIT = Number(process.env.SIGNIN_IP_LIMIT) || 20;

/**
 * The visitor's address. On Vercel these headers are set by the platform from
 * the real connection, so a client can't fake them.
 */
export function clientIp(request: Request | undefined) {
  const h = request?.headers;
  const ip = h?.get("x-real-ip") || h?.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (ip || "unknown").slice(0, 64);
}

async function recentFailures(ip: string) {
  const [row] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(signInFailures)
    .where(
      and(
        eq(signInFailures.ip, ip),
        gt(signInFailures.createdAt, sql`now() - make_interval(mins => ${IP_WINDOW_MINUTES})`),
      ),
    );
  return row?.n ?? 0;
}

export async function isIpBlocked(ip: string) {
  return (await recentFailures(ip)) >= IP_FAILURE_LIMIT;
}

/** Records a failed sign-in; alerts the admin the moment the address hits the limit. */
export async function recordFailure(ip: string) {
  await db.insert(signInFailures).values({ ip });
  if ((await recentFailures(ip)) === IP_FAILURE_LIMIT) {
    await db.insert(securityAlerts).values({ kind: "ip_blocked", detail: ip });
    const [admin] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, ADMIN_USERNAME));
    if (admin) notifyUsers([admin.id]);
  }
  // Housekeeping: nothing older than a day is needed.
  await db
    .delete(signInFailures)
    .where(lt(signInFailures.createdAt, sql`now() - interval '1 day'`));
}

/** Admin: lets an address try again right away. */
export async function unblockIp(ip: string) {
  await db.delete(signInFailures).where(eq(signInFailures.ip, ip));
}
