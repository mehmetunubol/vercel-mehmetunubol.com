import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { eventInvites, events, users } from "@/lib/db/schema";

export const EVENT_KEEP_DAYS = 7;
export const MAX_EVENT_DAYS_AHEAD = 365;

export const eventInputSchema = z.object({
  title: z.string().trim().min(1, "Give the event a title.").max(80, "Title is too long (80 max)."),
  description: z
    .string()
    .trim()
    .max(500, "Description is too long (500 max).")
    .optional()
    .transform((v) => (v ? v : null)),
  startsAt: z.iso.datetime({ offset: true }),
  durationMinutes: z
    .number()
    .int()
    .min(5, "Duration must be at least 5 minutes.")
    .max(24 * 60, "Duration can be at most 24 hours."),
  inviteeIds: z.array(z.uuid()).max(100),
});

export type EventInput = z.infer<typeof eventInputSchema>;

/** Why a start time can't be used, or null. Allows a few minutes of slack for "now". */
export function startProblem(startsAt: Date, now = new Date()) {
  if (startsAt.getTime() < now.getTime() - 5 * 60_000) return "That time has already passed.";
  if (startsAt.getTime() - now.getTime() > MAX_EVENT_DAYS_AHEAD * 86_400_000) {
    return `Pick a time within ${MAX_EVENT_DAYS_AHEAD} days.`;
  }
  return null;
}

/** Keeps only ids of real users other than the creator. */
export async function validInvitees(ids: string[], creatorId: string) {
  const unique = [...new Set(ids)].filter((id) => id !== creatorId);
  if (!unique.length) return [];
  const rows = await db.select({ id: users.id }).from(users).where(inArray(users.id, unique));
  return rows.map((r) => r.id);
}

export async function getEventForUser(eventId: string, userId: string) {
  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!event) return null;
  const invites = await db.select().from(eventInvites).where(eq(eventInvites.eventId, eventId));
  const visible = event.createdBy === userId || invites.some((i) => i.userId === userId);
  return visible ? { event, invites } : null;
}

/** Events (with invite lists) the user created or was invited to, from a week ago on. */
export async function listEventsFor(userId: string) {
  const mine = sql`(${events.createdBy} = ${userId} or exists (
    select 1 from ${eventInvites} ei where ei.event_id = ${events.id} and ei.user_id = ${userId}
  ))`;
  const recent = sql`${events.startsAt} + make_interval(mins => ${events.durationMinutes}) > now() - make_interval(days => ${EVENT_KEEP_DAYS})`;
  const rows = await db.select().from(events).where(and(mine, recent)).orderBy(events.startsAt);
  const ids = rows.map((r) => r.id);
  const invites = ids.length
    ? await db.select().from(eventInvites).where(inArray(eventInvites.eventId, ids))
    : [];
  return rows.map((event) => ({
    id: event.id,
    title: event.title,
    description: event.description,
    startsAt: event.startsAt.toISOString(),
    durationMinutes: event.durationMinutes,
    createdBy: event.createdBy,
    invites: invites
      .filter((i) => i.eventId === event.id)
      .map((i) => ({ userId: i.userId, response: i.response })),
  }));
}

/** Number of upcoming events the user hasn't answered yet. */
export async function pendingInviteCount(userId: string) {
  const [row] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(eventInvites)
    .innerJoin(events, eq(events.id, eventInvites.eventId))
    .where(
      and(
        eq(eventInvites.userId, userId),
        eq(eventInvites.response, "pending"),
        sql`${events.startsAt} + make_interval(mins => ${events.durationMinutes}) > now()`,
      ),
    );
  return row?.n ?? 0;
}

let lastCleanup = 0;

/** Deletes events that ended more than EVENT_KEEP_DAYS ago. */
export async function deleteOldEvents(force = false) {
  const now = Date.now();
  if (!force && now - lastCleanup < 10 * 60_000) return;
  lastCleanup = now;
  await db
    .delete(events)
    .where(
      lt(
        sql`${events.startsAt} + make_interval(mins => ${events.durationMinutes})`,
        sql`now() - make_interval(days => ${EVENT_KEEP_DAYS})`,
      ),
    );
}
