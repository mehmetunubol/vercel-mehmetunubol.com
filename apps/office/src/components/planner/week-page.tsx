"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@repo/ui";

// Everyday plans by weekday (0 = Monday), so the week never looks empty.
const PLANS: string[][] = [
  ["Gym, 19:00", "Water the plants"],
  ["Grocery shopping"],
  ["Call mum", "Laundry"],
  ["Pay rent"],
  ["Movie night"],
  ["Visit parents", "Farmers' market"],
  ["Clean the kitchen", "Plan next week"],
];

const noSubscribe = () => () => {};

/** This week, Monday first, computed in the browser. */
function useWeek() {
  const key = useSyncExternalStore(
    noSubscribe,
    () => new Date().toDateString(),
    () => "",
  );
  if (!key) return null;
  const today = new Date(key);
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    return { day, isToday: day.toDateString() === today.toDateString(), plans: PLANS[i]! };
  });
}

export function WeekPage() {
  const week = useWeek();
  return (
    <>
      <p className="eyebrow">This week</p>
      <h1 className="mt-1 text-[2rem] leading-tight font-semibold">Week</h1>
      <section className="glass mt-6 rounded-[1.75rem] p-2" aria-label="This week">
        <ul>
          {(week ?? []).map(({ day, isToday, plans }) => (
            <li key={day.toDateString()} className="flex gap-4 px-3 py-3">
              <div
                className={cn(
                  "grid size-12 shrink-0 place-items-center rounded-2xl text-center leading-tight",
                  isToday ? "bg-[var(--mine)] text-[var(--mine-ink)]" : "bg-[var(--field)]",
                )}
              >
                <span className="text-[11px] font-semibold uppercase">
                  {day.toLocaleDateString("en-GB", { weekday: "short" })}
                </span>
                <span className="text-base font-semibold tabular-nums">{day.getDate()}</span>
              </div>
              <ul className="min-w-0 flex-1 space-y-1 pt-1">
                {plans.map((plan) => (
                  <li key={plan} className="truncate text-[15px]">
                    {plan}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
