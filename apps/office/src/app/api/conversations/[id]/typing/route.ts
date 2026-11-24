import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { conversationMembers, conversations } from "@/lib/db/schema";
import { isUuid } from "@/lib/conversations";
import { getCurrentUser, unauthorized } from "@/lib/session";

/** "I'm typing" in this conversation. Ignored for people who hide their online status. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  const { id } = await params;
  if (!isUuid(id) || me.hideOnline) return new Response(null, { status: 204 });
  // In announcement groups only the admin can write, so only they can be typing.
  const [conversation] = await db
    .select({ announcement: conversations.announcement })
    .from(conversations)
    .where(eq(conversations.id, id))
    .limit(1);
  if (conversation?.announcement && !me.isAdmin) return new Response(null, { status: 204 });
  await db
    .update(conversationMembers)
    .set({ typingAt: sql`now()` })
    .where(and(eq(conversationMembers.conversationId, id), eq(conversationMembers.userId, me.id)));
  return new Response(null, { status: 204 });
}
