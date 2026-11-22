import { db } from "@/lib/db";
import { eventInvites, events } from "@/lib/db/schema";
import {
  deleteOldEvents,
  eventInputSchema,
  listEventsFor,
  startProblem,
  validInvitees,
} from "@/lib/events";
import { notifyUsers } from "@/lib/push";
import { badRequest, getCurrentUser, unauthorized } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  await deleteOldEvents();
  return Response.json({ events: await listEventsFor(me.id) });
}

export async function POST(request: Request) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  const parsed = eventInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]!.message);
  const input = parsed.data;
  const startsAt = new Date(input.startsAt);
  const problem = startProblem(startsAt);
  if (problem) return badRequest(problem);

  const inviteeIds = await validInvitees(input.inviteeIds, me.id);
  const [event] = await db
    .insert(events)
    .values({
      title: input.title,
      description: input.description,
      startsAt,
      durationMinutes: input.durationMinutes,
      createdBy: me.id,
    })
    .returning({ id: events.id });
  await db.insert(eventInvites).values([
    // The creator is attending by default; they can still change their answer.
    { eventId: event!.id, userId: me.id, response: "going", respondedAt: new Date() },
    ...inviteeIds.map((userId) => ({ eventId: event!.id, userId })),
  ]);
  notifyUsers(inviteeIds);
  return Response.json({ id: event!.id });
}
