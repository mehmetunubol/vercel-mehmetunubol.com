import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { eventInvites } from "@/lib/db/schema";
import { isUuid } from "@/lib/conversations";
import { badRequest, getCurrentUser, unauthorized } from "@/lib/session";

/** The caller's RSVP: going, maybe or declined. */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  const { id } = await params;
  const parsed = z
    .object({ response: z.enum(["going", "maybe", "declined"]) })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest("response must be going, maybe or declined");
  if (!isUuid(id)) return Response.json({ error: "not found" }, { status: 404 });

  const updated = await db
    .update(eventInvites)
    .set({ response: parsed.data.response, respondedAt: new Date() })
    .where(and(eq(eventInvites.eventId, id), eq(eventInvites.userId, me.id)))
    .returning({ eventId: eventInvites.eventId });
  if (!updated.length) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({ response: parsed.data.response });
}
