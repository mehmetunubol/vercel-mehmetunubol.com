import { and, asc, desc, eq, gt, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { messages } from "@/lib/db/schema";
import { deleteExpiredMessages } from "@/lib/cleanup";
import { getConversation, isMember, isUuid } from "@/lib/conversations";
import { getMessageTtlHours } from "@/lib/settings";
import { badRequest, getCurrentUser, unauthorized } from "@/lib/session";
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
    createdAt: messages.createdAt,
    expiresAt: messages.expiresAt,
  };

  const rows =
    after && !Number.isNaN(after.getTime())
      ? await db
          .select(columns)
          .from(messages)
          .where(and(eq(messages.conversationId, id), live, gte(messages.createdAt, after)))
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

  return Response.json({ messages: rows });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  const { id } = await params;
  const conversation = isUuid(id) ? await getConversation(id) : null;
  if (!conversation || !conversation.members.some((m) => m.id === me.id)) return notFound();

  const parsed = sendMessageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest("invalid message");
  const body = parsed.data;
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
      expiresAt: sql`now() + make_interval(hours => ${ttlHours})`,
    })
    .onConflictDoNothing()
    .returning({ id: messages.id, createdAt: messages.createdAt, expiresAt: messages.expiresAt });
  if (!row) return Response.json({ error: "duplicate id" }, { status: 409 });
  return Response.json(row);
}
