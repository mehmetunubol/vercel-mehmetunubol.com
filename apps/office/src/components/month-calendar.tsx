"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@repo/ui";
import { dayKey, monthGrid } from "@/lib/event-time";
import { useI18n } from "@/components/i18n-provider";

const WEEKDAYS = {
  en: ["M", "T", "W", "T", "F", "S", "S"],
  tr: ["P", "S", "Ç", "P", "C", "C", "P"],
};

export function MonthCalendar({
  eventDays,
  pendingDays,
  selected,
  onSelect,
}: {
  eventDays: Set<string>;
  pendingDays: Set<string>;
  selected: string | null;
  onSelect: (day: string | null) => void;
}) {
  const { t, locale, dateLocale } = useI18n();
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const today = dayKey(new Date());
  const weeks = monthGrid(cursor.year, cursor.month);
  const title = new Date(cursor.year, cursor.month, 1).toLocaleDateString(dateLocale, {
    month: "long",
    year: "numeric",
  });
  const shift = (delta: number) =>
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  return (
    <section className="glass-strong rise rounded-[1.75rem] p-4">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shift(-1)}
          aria-label={t("Previous month")}
          className="grid size-9 place-items-center rounded-full hover:bg-[var(--hairline)]"
        >
          <ChevronLeft size={18} />
        </button>
        <p className="font-semibold">{title}</p>
        <button
          type="button"
          onClick={() => shift(1)}
          aria-label={t("Next month")}
          className="grid size-9 place-items-center rounded-full hover:bg-[var(--hairline)]"
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center">
        {WEEKDAYS[locale].map((d, i) => (
          <span key={i} className="eyebrow py-1">
            {d}
          </span>
        ))}
        {weeks.flat().map((date, i) => {
          if (!date) return <span key={i} />;
          const key = dayKey(date);
          const isSelected = selected === key;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(isSelected ? null : key)}
              aria-pressed={isSelected}
              aria-label={date.toLocaleDateString(dateLocale, {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
              className={cn(
                "relative mx-auto my-0.5 grid size-10 place-items-center rounded-full text-sm tabular-nums transition-colors",
                isSelected
                  ? "bg-[var(--mine)] font-semibold text-[var(--mine-ink)]"
                  : key === today
                    ? "font-semibold ring-1 ring-[var(--ink-3)]"
                    : key < today
                      ? "text-[var(--ink-3)] hover:bg-[var(--hairline)]"
                      : "hover:bg-[var(--hairline)]",
              )}
            >
              {date.getDate()}
              {eventDays.has(key) ? (
                <span
                  className={cn(
                    "absolute bottom-1 size-1 rounded-full",
                    isSelected
                      ? "bg-[var(--mine-ink)]"
                      : pendingDays.has(key)
                        ? "bg-[var(--danger)]"
                        : "bg-[var(--ink-2)]",
                  )}
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
