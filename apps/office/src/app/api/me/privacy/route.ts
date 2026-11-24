import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { conversationMembers, users } from "@/lib/db/schema";
import { badRequest, getCurrentUser, unauthorized } from "@/lib/session";

/** "Hide my online status": others don't see yours, and you don't see theirs. */
export async function POST(request: Request) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  const parsed = z
    .object({ hideOnline: z.boolean() })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest("hideOnline must be true or false");
  await db.update(users).set({ hideOnline: parsed.data.hideOnline }).where(eq(users.id, me.id));
  if (parsed.data.hideOnline) {
    await db
      .update(conversationMembers)
      .set({ typingAt: null })
      .where(eq(conversationMembers.userId, me.id));
  }
  return Response.json({ hideOnline: parsed.data.hideOnline });
}
