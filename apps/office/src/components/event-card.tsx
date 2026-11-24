"use client";

import Link from "next/link";
import { useState } from "react";
import { Clock, Pencil } from "lucide-react";
import { cn } from "@repo/ui";
import { useNow } from "@/components/app-provider";
import { Avatar } from "@/components/avatar";
import { durationLabel, endOf, timeRange } from "@/lib/event-time";
import type { EventItem, Person, Rsvp } from "@/lib/types";
import { useI18n } from "@/components/i18n-provider";

const RESPONSES: { value: Exclude<Rsvp, "pending">; label: string }[] = [
  { value: "going", label: "Going" },
  { value: "maybe", label: "Maybe" },
  { value: "declined", label: "Can't go" },
];

const RESPONSE_TEXT: Record<Rsvp, string> = {
  going: "Going",
  maybe: "Maybe",
  declined: "Can't go",
  pending: "No reply",
};

export function EventCard({
  event,
  meId,
  personById,
  onRespond,
}: {
  event: EventItem;
  meId: string;
  personById: (id: string) => Person | undefined;
  onRespond: (response: Exclude<Rsvp, "pending">) => void;
}) {
  const [open, setOpen] = useState(false);
  const { t, locale } = useI18n();
  const now = useNow();
  const start = new Date(event.startsAt);
  const past = endOf(start, event.durationMinutes).getTime() < now;
  const mine = event.invites.find((i) => i.userId === meId)?.response;
  const isCreator = event.createdBy === meId;
  const creator = personById(event.createdBy);
  const count = (r: Rsvp) => event.invites.filter((i) => i.response === r).length;
  const summary = [
    count("going") && t("{n} going", { n: count("going") }),
    count("maybe") && t("{n} maybe", { n: count("maybe") }),
    count("declined") && t("{n} can't go", { n: count("declined") }),
    count("pending") && t("{n} no reply", { n: count("pending") }),
  ]
    .filter(Boolean)
    .join(" · ");
  // Attendees first, then maybes, no replies, and declines.
  const order: Rsvp[] = ["going", "maybe", "pending", "declined"];
  const invites = [...event.invites].sort(
    (a, b) => order.indexOf(a.response) - order.indexOf(b.response),
  );

  return (
    <article className={cn("glass rise rounded-[1.5rem] p-4", past && "opacity-60")}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="min-w-0 flex-1 text-left"
        >
          {mine === "pending" && !past ? (
            <p className="eyebrow mb-1 text-[var(--danger)]">{t("Invitation")}</p>
          ) : null}
          <p className="flex items-center gap-1.5 text-[13px] text-[var(--ink-2)] tabular-nums">
            <Clock size={13} /> {timeRange(start, event.durationMinutes)} ·{" "}
            {durationLabel(event.durationMinutes, locale)}
          </p>
          <h3 className="mt-0.5 text-[17px] leading-snug font-semibold">{event.title}</h3>
          <p className="mt-0.5 truncate text-[13px] text-[var(--ink-3)]">
            {isCreator
              ? t("Created by you")
              : t("From {name}", { name: creator?.displayName ?? t("a former member") })}
          </p>
        </button>
        {isCreator && !past ? (
          <Link
            href={`/events/${event.id}/edit`}
            aria-label={t("Edit event")}
            className="grid size-9 shrink-0 place-items-center rounded-full text-[var(--ink-2)] hover:bg-[var(--hairline)]"
          >
            <Pencil size={16} />
          </Link>
        ) : null}
      </div>

      {event.description ? (
        <p
          className={cn(
            "mt-2 text-sm leading-relaxed whitespace-pre-wrap text-[var(--ink-2)]",
            !open && "line-clamp-2",
          )}
        >
          {event.description}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-3 flex w-full items-center gap-2 text-left"
      >
        <span className="flex -space-x-1">
          {invites.slice(0, 5).map((i) => (
            <span
              key={i.userId}
              className={cn(
                "rounded-full ring-2 ring-[var(--bg)]",
                i.response === "declined" && "opacity-40",
              )}
            >
              <Avatar name={personById(i.userId)?.displayName ?? "?"} size={30} />
            </span>
          ))}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs text-[var(--ink-2)]">{summary}</span>
      </button>

      {open ? (
        <ul className="mt-3 space-y-1.5 border-t border-[var(--hairline)] pt-3 text-sm">
          {invites.map((i) => (
            <li key={i.userId} className="flex items-center justify-between gap-3">
              <span className="truncate">
                {personById(i.userId)?.displayName ?? t("Former member")}
                {i.userId === meId ? (
                  <span className="text-[var(--ink-3)]"> · {t("You")}</span>
                ) : null}
              </span>
              <span
                className={cn(
                  "shrink-0 text-xs",
                  i.response === "going"
                    ? "text-[var(--in)]"
                    : i.response === "declined"
                      ? "text-[var(--ink-3)]"
                      : "text-[var(--ink-2)]",
                )}
              >
                {t(RESPONSE_TEXT[i.response])}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {mine && !past ? (
        <div className="seg mt-3" role="group" aria-label={t("Your answer")}>
          {RESPONSES.map((r) => (
            <button
              key={r.value}
              type="button"
              aria-pressed={mine === r.value}
              onClick={() => onRespond(r.value)}
            >
              {t(r.label)}
            </button>
          ))}
        </div>
      ) : null}
    </article>
  );
}
