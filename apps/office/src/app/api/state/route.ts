import { asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { conversationMembers, conversations, messages, users } from "@/lib/db/schema";
import { deleteExpiredMessages } from "@/lib/cleanup";
import { pendingInviteCount } from "@/lib/events";
import { heartbeat } from "@/lib/online";
import { applyDuePlans } from "@/lib/presence";
import { deleteOldAlerts, unseenAlertCount } from "@/lib/security";
import { getLoginsDisabled, getMessageTtlHours, getPhotosAllowed } from "@/lib/settings";
import { getCurrentUser, unauthorized } from "@/lib/session";
import { ADMIN_USERNAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

/** Everything the home screen needs, polled by the client. */
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  // Polled every ~5 s while the app is on screen, so it doubles as the online check-in.
  await Promise.all([deleteExpiredMessages(), applyDuePlans(), heartbeat(me.id)]);

  const [people, myConversations, ttlHours, pendingInvites, photosAllowed] = await Promise.all([
    db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        presence: users.presence,
        presenceUpdatedAt: users.presenceUpdatedAt,
        plannedPresence: users.plannedPresence,
        plannedAt: users.plannedAt,
        plannedPrecision: users.plannedPrecision,
        hasKey: sql<boolean>`${users.publicKey} is not null`,
        hideOnline: users.hideOnline,
        online: sql<boolean>`coalesce(${users.onlineUntil} > now(), false)`,
        lastSeenAt: users.lastSeenAt,
      })
      .from(users)
      .orderBy(asc(users.displayName)),
    db
      .select({
        id: conversations.id,
        kind: conversations.kind,
        name: conversations.name,
        announcement: conversations.announcement,
        ttlHours: conversations.ttlHours,
        muted: sql<boolean>`coalesce(${conversationMembers.mutedUntil} > now(), false)`,
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
    pendingInviteCount(me.id),
    getPhotosAllowed(),
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

  // Online status is shared only between people who both show theirs.
  const visiblePeople = people.map(({ hideOnline, online, lastSeenAt, ...person }) => {
    const shown = person.id === me.id || (!me.hideOnline && !hideOnline);
    return { ...person, online: shown ? online : null, lastSeenAt: shown ? lastSeenAt : null };
  });

  return Response.json({
    me: {
      id: me.id,
      username: me.username,
      displayName: me.displayName,
      isAdmin: me.isAdmin,
      publicKey: me.publicKey,
      hideOnline: me.hideOnline,
      autoLockMinutes: me.autoLockMinutes,
      locale: me.locale,
    },
    people: visiblePeople.sort((a, b) =>
      a.username === ADMIN_USERNAME ? -1 : b.username === ADMIN_USERNAME ? 1 : 0,
    ),
    chats,
    ttlHours,
    pendingInvites,
    photosAllowed,
    // Admin only: unseen security alerts and whether the sign-in panic switch is on.
    admin: me.isAdmin
      ? await Promise.all([unseenAlertCount(), getLoginsDisabled(), deleteOldAlerts()]).then(
          ([securityAlerts, loginsDisabled]) => ({ securityAlerts, loginsDisabled }),
        )
      : null,
  });
}
