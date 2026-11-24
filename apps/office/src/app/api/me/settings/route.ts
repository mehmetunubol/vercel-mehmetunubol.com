import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { badRequest, getCurrentUser, unauthorized } from "@/lib/session";

const AUTO_LOCK = [1, 5, 15, 30];

/** Personal settings: auto-lock time. */
export async function POST(request: Request) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  const parsed = z
    .object({ autoLockMinutes: z.number().refine((n) => AUTO_LOCK.includes(n)) })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest("autoLockMinutes must be 1, 5, 15 or 30");
  await db
    .update(users)
    .set({ autoLockMinutes: parsed.data.autoLockMinutes })
    .where(eq(users.id, me.id));
  return Response.json(parsed.data);
}
