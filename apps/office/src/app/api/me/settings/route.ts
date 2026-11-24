import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { badRequest, getCurrentUser, unauthorized } from "@/lib/session";

const AUTO_LOCK = [1, 5, 15, 30];

/** Personal settings: auto-lock time and interface language. */
export async function POST(request: Request) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  const parsed = z
    .object({
      autoLockMinutes: z
        .number()
        .refine((n) => AUTO_LOCK.includes(n))
        .optional(),
      // null: follow the phone's language
      locale: z.enum(["en", "tr"]).nullable().optional(),
    })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest("invalid settings");
  const { autoLockMinutes, locale } = parsed.data;
  await db
    .update(users)
    .set({
      ...(autoLockMinutes !== undefined ? { autoLockMinutes } : {}),
      ...(locale !== undefined ? { locale } : {}),
    })
    .where(eq(users.id, me.id));
  return Response.json(parsed.data);
}
