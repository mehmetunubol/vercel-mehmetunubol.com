import { and, eq, gt, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { messageReactions, messages } from "@/lib/db/schema";
import { isMember, isUuid } from "@/lib/conversations";
import { badRequest, getCurrentUser, unauthorized } from "@/lib/session";

const notFound = () => Response.json({ error: "not found" }, { status: 404 });

/** Sets ("up" | "down") or clears (null) the caller's reaction to someone else's message. */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> },
) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  const { id, messageId } = await params;
  if (!isUuid(id) || !isUuid(messageId) || !(await isMember(id, me.id))) return notFound();

  const parsed = z
    .object({ reaction: z.enum(["up", "down"]).nullable() })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest("reaction must be 'up', 'down' or null");

  const [message] = await db
    .select({ senderId: messages.senderId })
    .from(messages)
    .where(
      and(
        eq(messages.id, messageId),
        eq(messages.conversationId, id),
        gt(messages.expiresAt, sql`now()`),
      ),
    )
    .limit(1);
  if (!message) return notFound();
  if (message.senderId === me.id) return badRequest("You can't react to your own message.");

  const { reaction } = parsed.data;
  if (reaction === null) {
    await db
      .delete(messageReactions)
      .where(and(eq(messageReactions.messageId, messageId), eq(messageReactions.userId, me.id)));
  } else {
    await db
      .insert(messageReactions)
      .values({ messageId, userId: me.id, reaction })
      .onConflictDoUpdate({
        target: [messageReactions.messageId, messageReactions.userId],
        set: { reaction, createdAt: sql`now()` },
      });
  }
  return Response.json({ reaction });
}
