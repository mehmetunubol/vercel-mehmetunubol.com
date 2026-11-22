"use client";

import { useCallback, useState } from "react";
import { usePolling } from "@/components/app-provider";
import type { EventItem, Rsvp } from "@/lib/types";

export function useEvents(intervalMs = 15_000) {
  const [events, setEvents] = useState<EventItem[] | null>(null);

  const reload = useCallback(async () => {
    const response = await fetch("/api/events", { cache: "no-store" });
    if (response.ok) setEvents(((await response.json()) as { events: EventItem[] }).events);
  }, []);

  usePolling(reload, intervalMs);

  /** Optimistically records the user's answer, then confirms with the server. */
  const respond = useCallback(
    async (eventId: string, userId: string, response: Exclude<Rsvp, "pending">) => {
      setEvents(
        (list) =>
          list?.map((e) =>
            e.id === eventId
              ? {
                  ...e,
                  invites: e.invites.map((i) => (i.userId === userId ? { ...i, response } : i)),
                }
              : e,
          ) ?? null,
      );
      await fetch(`/api/events/${eventId}/response`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ response }),
      }).catch(() => {});
      await reload();
    },
    [reload],
  );

  return { events, reload, respond };
}
