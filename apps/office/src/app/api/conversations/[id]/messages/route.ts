import { and, asc, desc, eq, gt, gte, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { conversationMembers, messageReactions, messages } from "@/lib/db/schema";
import { deleteExpiredMessages } from "@/lib/cleanup";
import { getConversation, isMember, isUuid } from "@/lib/conversations";
import { notifyUsers } from "@/lib/push";
import { getMessageTtlHours } from "@/lib/settings";
import { badRequest, forbidden, getCurrentUser, unauthorized } from "@/lib/session";
import { sendMessageSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

const notFound = () => Response.json({ error: "not found" }, { status: 404 });

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  const { id } = await params;
  if (!isUuid(id) || !(await isMember(id, me.id))) return notFound();
  await deleteExpiredMessages();

  const afterParam = new URL(request.url).searchParams.get("after");
  const after = afterParam ? new Date(afterParam) : null;
  const live = gt(messages.expiresAt, sql`now()`);

  const columns = {
    id: messages.id,
    senderId: messages.senderId,
    senderPublicKey: messages.senderPublicKey,
    ciphertext: messages.ciphertext,
    iv: messages.iv,
    // Only hand out the caller's own wrapped key.
    wrappedKey: sql<string | null>`${messages.keys} ->> ${me.id}`,
    replyToId: messages.replyToId,
    editedAt: messages.editedAt,
    createdAt: messages.createdAt,
    expiresAt: messages.expiresAt,
    // Clients poll from the latest of these, so edits come through too.
    updatedAt:
      sql<string>`greatest(${messages.createdAt}, coalesce(${messages.editedAt}, ${messages.createdAt}))`.mapWith(
        (v: string | Date) => new Date(v),
      ),
  };

  const rows =
    after && !Number.isNaN(after.getTime())
      ? await db
          .select(columns)
          .from(messages)
          .where(
            and(
              eq(messages.conversationId, id),
              live,
              or(gte(messages.createdAt, after), gte(messages.editedAt, after)),
            ),
          )
          .orderBy(asc(messages.createdAt))
          .limit(200)
      : (
          await db
            .select(columns)
            .from(messages)
            .where(and(eq(messages.conversationId, id), live))
            .orderBy(desc(messages.createdAt))
            .limit(200)
        ).reverse();

  // Read state and reactions are small and change on older messages too, so
  // every poll returns them in full for the conversation.
  const [reads, reactions, liveIds] = await Promise.all([
    db
      .select({
        userId: conversationMembers.userId,
        lastReadAt: conversationMembers.lastReadAt,
        joinedAt: conversationMembers.joinedAt,
      })
      .from(conversationMembers)
      .where(eq(conversationMembers.conversationId, id)),
    db
      .select({
        messageId: messageReactions.messageId,
        userId: messageReactions.userId,
        reaction: messageReactions.reaction,
      })
      .from(messageReactions)
      .innerJoin(messages, eq(messages.id, messageReactions.messageId))
      .where(and(eq(messages.conversationId, id), live)),
    // Every live message id, so clients drop ones that were deleted (panic purge).
    db
      .select({ id: messages.id })
      .from(messages)
      .where(and(eq(messages.conversationId, id), live))
      .then((r) => r.map((m) => m.id)),
  ]);

  return Response.json({ messages: rows, reads, reactions, liveIds });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  const { id } = await params;
  const conversation = isUuid(id) ? await getConversation(id) : null;
  if (!conversation || !conversation.members.some((m) => m.id === me.id)) return notFound();

  if (conversation.announcement && !me.isAdmin) return forbidden();

  const parsed = sendMessageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest("invalid message");
  const body = parsed.data;
  // A reply must point at a live message in the same conversation; otherwise drop it.
  let replyToId: string | null = null;
  if (body.replyToId) {
    const [target] = await db
      .select({ id: messages.id })
      .from(messages)
      .where(
        and(
          eq(messages.id, body.replyToId),
          eq(messages.conversationId, id),
          gt(messages.expiresAt, sql`now()`),
        ),
      )
      .limit(1);
    replyToId = target?.id ?? null;
  }
  if (body.senderPublicKey !== me.publicKey) {
    return Response.json({ error: "stale key" }, { status: 409 });
  }

  // Keep only keys for current members, and require one for the sender.
  const memberIds = new Set(conversation.members.map((m) => m.id));
  const keys = Object.fromEntries(Object.entries(body.keys).filter(([uid]) => memberIds.has(uid)));
  if (!keys[me.id]) return badRequest("missing sender key");

  const ttlHours = await getMessageTtlHours();
  const [row] = await db
    .insert(messages)
    .values({
      id: body.id,
      conversationId: id,
      senderId: me.id,
      senderPublicKey: body.senderPublicKey,
      ciphertext: body.ciphertext,
      iv: body.iv,
      keys,
      replyToId,
      expiresAt: sql`now() + make_interval(hours => ${ttlHours})`,
    })
    .onConflictDoNothing()
    .returning({ id: messages.id, createdAt: messages.createdAt, expiresAt: messages.expiresAt });
  if (!row) return Response.json({ error: "duplicate id" }, { status: 409 });
  notifyUsers(conversation.members.map((m) => m.id).filter((uid) => uid !== me.id));
  return Response.json(row);
}
