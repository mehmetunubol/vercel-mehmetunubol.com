import { clock, toDateInput } from "@/lib/plan";

export function durationLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function endOf(startsAt: Date, durationMinutes: number) {
  return new Date(startsAt.getTime() + durationMinutes * 60_000);
}

/** "14:00–15:30", with "+1" when it ends on a later day. */
export function timeRange(startsAt: Date, durationMinutes: number) {
  const end = endOf(startsAt, durationMinutes);
  const days = Math.round(
    (new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime() -
      new Date(startsAt.getFullYear(), startsAt.getMonth(), startsAt.getDate()).getTime()) /
      86_400_000,
  );
  return `${clock(startsAt)}–${clock(end)}${days > 0 ? ` (+${days})` : ""}`;
}

export const dayKey = (date: Date) => toDateInput(date);

/** "Today", "Tomorrow", "Yesterday", or "Wed 25 Nov" (with year if not this year). */
export function dayHeading(date: Date, now = new Date()) {
  const key = dayKey(date);
  const offset = (n: number) =>
    dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + n));
  if (key === offset(0)) return "Today";
  if (key === offset(1)) return "Tomorrow";
  if (key === offset(-1)) return "Yesterday";
  const weekday = date.toLocaleDateString("en-GB", { weekday: "short" });
  const day = date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(date.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  });
  return `${weekday} ${day}`;
}

/** Weeks (Monday first) covering the month; days outside the month are null. */
export function monthGrid(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7; // Monday = 0
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: days }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (cells.length % 7) cells.push(null);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
