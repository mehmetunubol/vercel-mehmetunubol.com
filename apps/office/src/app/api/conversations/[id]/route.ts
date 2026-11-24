import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { logAdmin } from "@/lib/admin-log";
import { MAX_MESSAGE_TTL_HOURS, MIN_MESSAGE_TTL_HOURS } from "@/lib/constants";
import { getConversation, isUuid } from "@/lib/conversations";
import { db } from "@/lib/db";
import { conversationMembers, conversations } from "@/lib/db/schema";
import { badRequest, forbidden, getCurrentUser, unauthorized } from "@/lib/session";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  const { id } = await params;
  const conversation = isUuid(id) ? await getConversation(id) : null;
  if (!conversation || !conversation.members.some((m) => m.id === me.id)) {
    return Response.json({ error: "not found" }, { status: 404 });
  }
  return Response.json(conversation);
}

const MUTE_HOURS = { "8h": 8, week: 24 * 7, always: 24 * 365 * 100 } as const;

/**
 * Chat settings.
 * - ttlHours: how long messages in this chat last (null = the global setting).
 *   Either person in a private chat may change it; for groups, only the admin.
 * - mute: "off" | "8h" | "week" | "always": no notifications from this chat (just for you).
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  const { id } = await params;
  const conversation = isUuid(id) ? await getConversation(id) : null;
  if (!conversation || !conversation.members.some((m) => m.id === me.id)) {
    return Response.json({ error: "not found" }, { status: 404 });
  }
  const parsed = z
    .object({
      ttlHours: z
        .number()
        .int()
        .min(MIN_MESSAGE_TTL_HOURS)
        .max(MAX_MESSAGE_TTL_HOURS)
        .nullable()
        .optional(),
      mute: z.enum(["off", "8h", "week", "always"]).optional(),
    })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest("invalid chat settings");
  const { ttlHours, mute } = parsed.data;

  if (ttlHours !== undefined) {
    if (conversation.kind === "group" && !me.isAdmin) return forbidden();
    await db.update(conversations).set({ ttlHours }).where(eq(conversations.id, id));
    if (conversation.kind === "group") {
      await logAdmin(
        "group.message_ttl",
        `Set messages in "${conversation.name}" to ${ttlHours === null ? "the default lifetime" : `${ttlHours} hours`}`,
      );
    }
  }
  if (mute !== undefined) {
    await db
      .update(conversationMembers)
      .set({
        mutedUntil:
          mute === "off" ? null : sql`now() + make_interval(hours => ${MUTE_HOURS[mute]})`,
      })
      .where(
        and(eq(conversationMembers.conversationId, id), eq(conversationMembers.userId, me.id)),
      );
  }
  return Response.json({ ok: true });
}
