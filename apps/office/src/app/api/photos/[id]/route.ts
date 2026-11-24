import { and, eq, gt, isNotNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { attachments, attachmentViews, messages } from "@/lib/db/schema";
import { isMember, isUuid } from "@/lib/conversations";
import { forbidden, getCurrentUser, unauthorized } from "@/lib/session";

export const dynamic = "force-dynamic";

const notFound = () => Response.json({ error: "not found" }, { status: 404 });
const gone = () => Response.json({ error: "already viewed" }, { status: 410 });

/**
 * Returns a photo's ciphertext to a member of its conversation.
 * One-time photos: each recipient gets it once (the sender never does), and
 * the ciphertext is erased as soon as every recipient has opened it.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  const { id } = await params;
  if (!isUuid(id)) return notFound();

  const [photo] = await db
    .select({
      id: attachments.id,
      kind: attachments.kind,
      iv: attachments.iv,
      ciphertext: attachments.ciphertext,
      conversationId: messages.conversationId,
      senderId: messages.senderId,
      keys: messages.keys,
    })
    .from(attachments)
    .innerJoin(messages, eq(messages.id, attachments.messageId))
    .where(and(eq(attachments.id, id), gt(messages.expiresAt, sql`now()`)))
    .limit(1);
  if (!photo || !(await isMember(photo.conversationId, me.id))) return notFound();

  if (photo.kind === "normal") {
    return Response.json({ ciphertext: photo.ciphertext, iv: photo.iv });
  }

  if (photo.senderId === me.id) return forbidden();
  if (!photo.ciphertext) return gone();
  // Claim the single view; a second request (or a race) gets nothing.
  const claimed = await db
    .insert(attachmentViews)
    .values({ attachmentId: id, userId: me.id })
    .onConflictDoNothing()
    .returning({ userId: attachmentViews.userId });
  if (!claimed.length) return gone();

  // Erase the bytes once everyone the photo was encrypted for has opened it.
  const recipients = Object.keys(photo.keys).filter((uid) => uid !== photo.senderId);
  const viewers = await db
    .select({ userId: attachmentViews.userId })
    .from(attachmentViews)
    .where(eq(attachmentViews.attachmentId, id));
  const seen = new Set(viewers.map((v) => v.userId));
  if (recipients.every((uid) => seen.has(uid))) {
    await db
      .update(attachments)
      .set({ ciphertext: null })
      .where(and(eq(attachments.id, id), isNotNull(attachments.ciphertext)));
  }
  return Response.json({ ciphertext: photo.ciphertext, iv: photo.iv });
}
