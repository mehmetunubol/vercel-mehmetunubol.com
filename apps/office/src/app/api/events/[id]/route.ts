import { and, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { eventInvites, events } from "@/lib/db/schema";
import { isUuid } from "@/lib/conversations";
import { eventInputSchema, getEventForUser, startProblem, validInvitees } from "@/lib/events";
import { notifyUsers } from "@/lib/push";
import { badRequest, forbidden, getCurrentUser, unauthorized } from "@/lib/session";

const notFound = () => Response.json({ error: "not found" }, { status: 404 });

/** Creator edits the event. Changing the time asks everyone else to answer again. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  const { id } = await params;
  const found = isUuid(id) ? await getEventForUser(id, me.id) : null;
  if (!found) return notFound();
  if (found.event.createdBy !== me.id) return forbidden();

  const parsed = eventInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]!.message);
  const input = parsed.data;
  const startsAt = new Date(input.startsAt);
  const timeChanged =
    startsAt.getTime() !== found.event.startsAt.getTime() ||
    input.durationMinutes !== found.event.durationMinutes;
  if (timeChanged) {
    const problem = startProblem(startsAt);
    if (problem) return badRequest(problem);
  }

  await db
    .update(events)
    .set({
      title: input.title,
      description: input.description,
      startsAt,
      durationMinutes: input.durationMinutes,
    })
    .where(eq(events.id, id));

  const wanted = new Set(await validInvitees(input.inviteeIds, me.id));
  const current = found.invites.map((i) => i.userId).filter((uid) => uid !== me.id);
  const removed = current.filter((uid) => !wanted.has(uid));
  const added = [...wanted].filter((uid) => !current.includes(uid));
  if (removed.length) {
    await db
      .delete(eventInvites)
      .where(and(eq(eventInvites.eventId, id), inArray(eventInvites.userId, removed)));
  }
  if (added.length) {
    await db
      .insert(eventInvites)
      .values(added.map((userId) => ({ eventId: id, userId })))
      .onConflictDoNothing();
  }
  if (timeChanged) {
    await db
      .update(eventInvites)
      .set({ response: "pending", respondedAt: null })
      .where(and(eq(eventInvites.eventId, id), ne(eventInvites.userId, me.id)));
  }
  // New invitees, and everyone if the time moved (they need to answer again).
  notifyUsers(timeChanged ? [...wanted] : added);
  return Response.json({ ok: true });
}

/** Creator cancels the event. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  const { id } = await params;
  const found = isUuid(id) ? await getEventForUser(id, me.id) : null;
  if (!found) return notFound();
  if (found.event.createdBy !== me.id) return forbidden();
  await db.delete(events).where(eq(events.id, id));
  return Response.json({ ok: true });
}
