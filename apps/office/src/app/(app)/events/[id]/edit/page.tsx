import { notFound, redirect } from "next/navigation";
import { EventForm } from "@/components/event-form";
import { isUuid } from "@/lib/conversations";
import { getEventForUser } from "@/lib/events";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me) redirect("/");
  const found = isUuid(id) ? await getEventForUser(id, me.id) : null;
  if (!found) notFound();
  if (found.event.createdBy !== me.id) redirect("/events");
  const { event, invites } = found;
  return (
    <EventForm
      existing={{
        id: event.id,
        title: event.title,
        description: event.description,
        startsAt: event.startsAt.toISOString(),
        durationMinutes: event.durationMinutes,
        createdBy: event.createdBy,
        invites: invites.map((i) => ({ userId: i.userId, response: i.response })),
      }}
    />
  );
}
