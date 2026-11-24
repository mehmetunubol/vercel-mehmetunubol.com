import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { messages } from "@/lib/db/schema";
import { getConversation, isUuid } from "@/lib/conversations";
import { badRequest, forbidden, getCurrentUser, unauthorized } from "@/lib/session";
import { encryptedBodySchema } from "@/lib/validation";

const notFound = () => Response.json({ error: "not found" }, { status: 404 });

type Params = { params: Promise<{ id: string; messageId: string }> };

/** Loads a live message the caller sent, in a conversation they're in. */
async function ownMessage(conversationId: string, messageId: string, userId: string) {
  if (!isUuid(conversationId) || !isUuid(messageId)) return null;
  const conversation = await getConversation(conversationId);
  if (!conversation || !conversation.members.some((m) => m.id === userId)) return null;
  const [message] = await db
    .select({ id: messages.id, senderId: messages.senderId })
    .from(messages)
    .where(
      and(
        eq(messages.id, messageId),
        eq(messages.conversationId, conversationId),
        gt(messages.expiresAt, sql`now()`),
      ),
    )
    .limit(1);
  return message ? { conversation, message } : null;
}

/**
 * Edits your own message. The browser re-encrypts the new text under the same
 * message id (bound into the ciphertext), so the server still never sees it.
 */
export async function PATCH(request: Request, { params }: Params) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  const { id, messageId } = await params;
  const found = await ownMessage(id, messageId, me.id);
  if (!found) return notFound();
  if (found.message.senderId !== me.id) return forbidden();

  const parsed = encryptedBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest("invalid message");
  const body = parsed.data;
  if (body.senderPublicKey !== me.publicKey)
    return Response.json({ error: "stale key" }, { status: 409 });
  const memberIds = new Set(found.conversation.members.map((m) => m.id));
  const keys = Object.fromEntries(Object.entries(body.keys).filter(([uid]) => memberIds.has(uid)));
  if (!keys[me.id]) return badRequest("missing sender key");

  const [row] = await db
    .update(messages)
    .set({
      senderPublicKey: body.senderPublicKey,
      ciphertext: body.ciphertext,
      iv: body.iv,
      keys,
      editedAt: sql`now()`,
    })
    .where(eq(messages.id, messageId))
    .returning({ editedAt: messages.editedAt });
  return Response.json(row);
}

/** Deletes your own message for everyone. */
export async function DELETE(_request: Request, { params }: Params) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  const { id, messageId } = await params;
  const found = await ownMessage(id, messageId, me.id);
  if (!found) return notFound();
  if (found.message.senderId !== me.id) return forbidden();
  await db.delete(messages).where(eq(messages.id, messageId));
  return Response.json({ ok: true });
}
