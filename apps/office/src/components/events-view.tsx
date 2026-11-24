"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useApp, useNow } from "@/components/app-provider";
import { EventCard } from "@/components/event-card";
import { MonthCalendar } from "@/components/month-calendar";
import { useEvents } from "@/components/use-events";
import { dayHeading, dayKey, endOf } from "@/lib/event-time";
import type { EventItem } from "@/lib/types";
import { useI18n } from "@/components/i18n-provider";

export function EventsView() {
  const { state, personById } = useApp();
  const { t, locale } = useI18n();
  const { events, respond } = useEvents();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const meId = state?.me.id ?? "";
  const now = useNow();

  const { eventDays, pendingDays, groups } = useMemo(() => {
    const eventDays = new Set<string>();
    const pendingDays = new Set<string>();
    for (const e of events ?? []) {
      const key = dayKey(new Date(e.startsAt));
      eventDays.add(key);
      if (e.invites.some((i) => i.userId === meId && i.response === "pending"))
        pendingDays.add(key);
    }
    // Upcoming by default; a selected day shows that day (past or not).
    const visible = (events ?? []).filter((e) =>
      selectedDay
        ? dayKey(new Date(e.startsAt)) === selectedDay
        : endOf(new Date(e.startsAt), e.durationMinutes).getTime() >= now,
    );
    const groups = new Map<string, EventItem[]>();
    for (const e of visible) {
      const key = dayKey(new Date(e.startsAt));
      groups.set(key, [...(groups.get(key) ?? []), e]);
    }
    return { eventDays, pendingDays, groups: [...groups.entries()] };
  }, [events, selectedDay, meId, now]);

  const newHref = selectedDay ? `/events/new?day=${selectedDay}` : "/events/new";

  return (
    <main className="safe-top mx-auto w-full max-w-5xl px-4 pb-32 sm:px-6">
      <header className="flex items-end justify-between pt-4 pb-5">
        <div>
          <p className="eyebrow">{t("Calendar")}</p>
          <h1 className="mt-1 text-3xl font-semibold">{t("Events")}</h1>
        </div>
        <Link href={newHref} className="btn btn-primary">
          <Plus size={18} /> {t("New event")}
        </Link>
      </header>

      <div className="grid gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-start">
        <MonthCalendar
          eventDays={eventDays}
          pendingDays={pendingDays}
          selected={selectedDay}
          onSelect={setSelectedDay}
        />

        <div className="space-y-5">
          {selectedDay ? (
            <div className="flex items-center justify-between px-1">
              <p className="text-sm text-[var(--ink-2)]">
                {t("Showing {day}", {
                  day: dayHeading(new Date(`${selectedDay}T12:00`), new Date(), locale),
                })}
              </p>
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="btn btn-quiet btn-sm"
              >
                {t("Show all upcoming")}
              </button>
            </div>
          ) : null}

          {events && groups.length === 0 ? (
            <div className="glass rounded-[1.5rem] p-5 text-sm text-[var(--ink-2)]">
              {selectedDay
                ? t("Nothing planned that day.")
                : t("No upcoming events. Create one and invite people.")}
            </div>
          ) : null}

          {groups.map(([key, list]) => (
            <section key={key} className="space-y-2.5">
              <h2 className="eyebrow px-1">
                {dayHeading(new Date(`${key}T12:00`), new Date(), locale)}
              </h2>
              {list.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  meId={meId}
                  personById={personById}
                  onRespond={(response) => void respond(event.id, meId, response)}
                />
              ))}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
