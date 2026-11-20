import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { conversationMembers } from "@/lib/db/schema";
import { isUuid } from "@/lib/conversations";
import { getCurrentUser, unauthorized } from "@/lib/session";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  const { id } = await params;
  if (!isUuid(id)) return Response.json({ ok: false }, { status: 404 });
  await db
    .update(conversationMembers)
    .set({ lastReadAt: sql`now()` })
    .where(and(eq(conversationMembers.conversationId, id), eq(conversationMembers.userId, me.id)));
  return Response.json({ ok: true });
}
