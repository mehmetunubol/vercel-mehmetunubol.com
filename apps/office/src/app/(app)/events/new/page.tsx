import { EventForm } from "@/components/event-form";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const { day } = await searchParams;
  return <EventForm initialDay={day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null} />;
}
