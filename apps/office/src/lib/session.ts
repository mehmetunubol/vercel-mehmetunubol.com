import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { ADMIN_USERNAME } from "@/lib/constants";
import { LIVE_COOKIE } from "@/lib/live-session";

export type CurrentUser = typeof users.$inferSelect & { isAdmin: boolean };

/**
 * The signed-in user, re-read from the database on every call so deleted
 * users and reset passwords (tokenVersion bump) take effect immediately.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  // No live-session cookie means the browser was closed since signing in.
  if ((await cookies()).get(LIVE_COOKIE)?.value !== "1") return null;
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) return null;
  const [user] = await db.select().from(users).where(eq(users.id, uid)).limit(1);
  if (!user || user.tokenVersion !== session.tokenVersion) return null;
  return { ...user, isAdmin: user.username === ADMIN_USERNAME };
}

export function unauthorized() {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}

export function forbidden() {
  return Response.json({ error: "forbidden" }, { status: 403 });
}

export function badRequest(error: string) {
  return Response.json({ error }, { status: 400 });
}
