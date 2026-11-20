import { asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { conversationMembers, conversations, messages, users } from "@/lib/db/schema";
import { deleteExpiredMessages } from "@/lib/cleanup";
import { getMessageTtlHours } from "@/lib/settings";
import { getCurrentUser, unauthorized } from "@/lib/session";
import { ADMIN_USERNAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

/** Everything the home screen needs, polled by the client. */
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  await deleteExpiredMessages();

  const [people, myConversations, ttlHours] = await Promise.all([
    db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        presence: users.presence,
        presenceUpdatedAt: users.presenceUpdatedAt,
        hasKey: sql<boolean>`${users.publicKey} is not null`,
      })
      .from(users)
      .orderBy(asc(users.displayName)),
    db
      .select({
        id: conversations.id,
        kind: conversations.kind,
        name: conversations.name,
        lastMessageAt: sql<string | null>`(
          select max(m.created_at) from ${messages} m
          where m.conversation_id = ${conversations.id} and m.expires_at > now()
        )`,
        unread: sql<number>`(
          select count(*) from ${messages} m
          where m.conversation_id = ${conversations.id}
            and m.expires_at > now()
            and m.sender_id <> ${me.id}
            and m.created_at > ${conversationMembers.lastReadAt}
        )`.mapWith(Number),
      })
      .from(conversationMembers)
      .innerJoin(conversations, eq(conversations.id, conversationMembers.conversationId))
      .where(eq(conversationMembers.userId, me.id)),
    getMessageTtlHours(),
  ]);

  const ids = myConversations.map((c) => c.id);
  const memberRows = ids.length
    ? await db
        .select({
          conversationId: conversationMembers.conversationId,
          userId: conversationMembers.userId,
        })
        .from(conversationMembers)
        .where(inArray(conversationMembers.conversationId, ids))
    : [];
  const membersByConversation = new Map<string, string[]>();
  for (const row of memberRows) {
    const list = membersByConversation.get(row.conversationId) ?? [];
    list.push(row.userId);
    membersByConversation.set(row.conversationId, list);
  }

  const chats = myConversations
    .map((c) => ({
      ...c,
      lastMessageAt: c.lastMessageAt ? new Date(c.lastMessageAt).toISOString() : null,
      memberIds: membersByConversation.get(c.id) ?? [],
    }))
    // A direct chat whose other member was deleted has nobody left to talk to.
    .filter((c) => c.kind === "group" || c.memberIds.length === 2)
    .sort((a, b) => (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""));

  return Response.json({
    me: {
      id: me.id,
      username: me.username,
      displayName: me.displayName,
      isAdmin: me.isAdmin,
      publicKey: me.publicKey,
    },
    people: people.sort((a, b) =>
      a.username === ADMIN_USERNAME ? -1 : b.username === ADMIN_USERNAME ? 1 : 0,
    ),
    chats,
    ttlHours,
  });
}
