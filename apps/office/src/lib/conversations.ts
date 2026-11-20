import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { conversationMembers, conversations, users } from "@/lib/db/schema";

export function directKey(a: string, b: string) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export async function isMember(conversationId: string, userId: string) {
  const [row] = await db
    .select({ userId: conversationMembers.userId })
    .from(conversationMembers)
    .where(
      and(
        eq(conversationMembers.conversationId, conversationId),
        eq(conversationMembers.userId, userId),
      ),
    )
    .limit(1);
  return Boolean(row);
}

export async function getConversation(conversationId: string) {
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);
  if (!conversation) return null;
  const members = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      publicKey: users.publicKey,
      presence: users.presence,
      joinedAt: conversationMembers.joinedAt,
    })
    .from(conversationMembers)
    .innerJoin(users, eq(users.id, conversationMembers.userId))
    .where(eq(conversationMembers.conversationId, conversationId));
  return { ...conversation, members };
}

export const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
