import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { conversationMembers, conversations, users } from "@/lib/db/schema";
import { directKey } from "@/lib/conversations";
import { badRequest, getCurrentUser, unauthorized } from "@/lib/session";

/** Opens (creating if needed) the private chat between the caller and another user. */
export async function POST(request: Request) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  const parsed = z.object({ userId: z.uuid() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.userId === me.id) return badRequest("invalid user");

  const [other] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, parsed.data.userId))
    .limit(1);
  if (!other) return badRequest("unknown user");

  const key = directKey(me.id, other.id);
  await db.insert(conversations).values({ kind: "direct", directKey: key }).onConflictDoNothing();
  const [conversation] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(eq(conversations.directKey, key))
    .limit(1);
  await db
    .insert(conversationMembers)
    .values([
      { conversationId: conversation!.id, userId: me.id },
      { conversationId: conversation!.id, userId: other.id },
    ])
    .onConflictDoNothing();
  return Response.json({ id: conversation!.id });
}
