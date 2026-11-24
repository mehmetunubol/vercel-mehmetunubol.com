import { MAX_PLAN_DAYS } from "@/lib/constants";
import { dateLocale, type Locale } from "@/lib/i18n";
import type { PlanPrecision, Presence } from "@/lib/types";

/**
 * Scheduled presence changes ("back in 2 h", "leaving at 17:00",
 * "back Wed 25 Nov, morning"). Times are computed in the browser's local time
 * and stored as absolute timestamps; a part-of-day plan flips at that part's
 * start hour.
 */

export const PART_OF_DAY_HOUR: Record<Exclude<PlanPrecision, "exact">, number> = {
  morning: 9,
  afternoon: 13,
  evening: 18,
};

export const PLAN_PRECISIONS = ["exact", "morning", "afternoon", "evening"] as const;
export { MAX_PLAN_DAYS } from "@/lib/constants";

export const opposite = (presence: Presence): Presence => (presence === "in" ? "out" : "in");

const pad = (n: number) => String(n).padStart(2, "0");
export const clock = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dayDiff(from: Date, to: Date) {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000);
}

function dayName(date: Date, now: Date, locale: Locale = "en") {
  const tag = dateLocale(locale);
  const weekday = date.toLocaleDateString(tag, { weekday: "short" });
  const day = date.toLocaleDateString(tag, {
    day: "numeric",
    month: "short",
    ...(date.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  });
  return `${weekday} ${day}`;
}

function relative(minutes: number, locale: Locale = "en") {
  const total = Math.max(1, Math.round(minutes));
  const tr = locale === "tr";
  if (total < 60) return tr ? `${total} dk içinde` : `in ${total} min`;
  // Past an hour, 5-minute steps read more naturally ("in 1 h 55 min").
  const rounded = Math.round(total / 5) * 5;
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  if (tr) return m === 0 ? `${h} sa içinde` : `${h} sa ${m} dk içinde`;
  return m === 0 ? `in ${h} h` : `in ${h} h ${m} min`;
}

const PART_TR: Record<Exclude<PlanPrecision, "exact">, string> = {
  morning: "sabah",
  afternoon: "öğleden sonra",
  evening: "akşam",
};

/** The "when" part: "in 2 h", "at 15:00", "tomorrow morning", "Wed 25 Nov at 09:00". */
export function whenLabel(
  at: Date,
  precision: PlanPrecision,
  now = new Date(),
  locale: Locale = "en",
) {
  const days = dayDiff(now, at);
  const tr = locale === "tr";
  if (precision !== "exact") {
    const part = tr ? PART_TR[precision] : precision;
    if (days === 0)
      return tr ? `bu ${part}` : precision === "evening" ? "this evening" : `this ${precision}`;
    if (days === 1) return tr ? `yarın ${part}` : `tomorrow ${precision}`;
    return `${dayName(at, now, locale)}, ${part}`;
  }
  const minutes = (at.getTime() - now.getTime()) / 60_000;
  if (minutes <= 0) return tr ? "şimdi" : "now";
  if (days === 0)
    return minutes < 180 ? relative(minutes, locale) : tr ? `saat ${clock(at)}` : `at ${clock(at)}`;
  if (days === 1) return tr ? `yarın ${clock(at)}` : `tomorrow at ${clock(at)}`;
  return tr
    ? `${dayName(at, now, locale)} ${clock(at)}`
    : `${dayName(at, now, locale)} at ${clock(at)}`;
}

/** Full plan sentence, e.g. "Back in 2 h" or "Leaving at 17:00". */
export function planLabel(
  target: Presence,
  at: Date,
  precision: PlanPrecision,
  now = new Date(),
  locale: Locale = "en",
) {
  const when = whenLabel(at, precision, now, locale);
  if (locale === "tr") return `${target === "in" ? "Dönüş" : "Çıkış"}: ${when}`;
  return `${target === "in" ? "Back" : "Leaving"} ${when}`;
}

/** Absolute detail for the planner preview, e.g. "Wed 25 Nov, 09:00". */
export function exactLabel(at: Date, now = new Date(), locale: Locale = "en") {
  return `${dayName(at, now, locale)}, ${clock(at)}`;
}

/** Local date from "YYYY-MM-DD" plus a part of day or "HH:MM". */
export function dateFromParts(day: string, precision: PlanPrecision, time?: string): Date | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!d) return null;
  let hours: number;
  let minutes = 0;
  if (precision === "exact") {
    const t = /^(\d{2}):(\d{2})$/.exec(time ?? "");
    if (!t) return null;
    hours = Number(t[1]);
    minutes = Number(t[2]);
  } else {
    hours = PART_OF_DAY_HOUR[precision];
  }
  return new Date(Number(d[1]), Number(d[2]) - 1, Number(d[3]), hours, minutes);
}

export function toDateInput(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Why a plan time can't be used, or null if it's fine. */
export function planProblem(at: Date | null, now = new Date()): string | null {
  if (!at || Number.isNaN(at.getTime())) return "Pick a time.";
  if (at.getTime() <= now.getTime()) return "That time has already passed.";
  if (at.getTime() - now.getTime() > MAX_PLAN_DAYS * 86_400_000) {
    return `Pick a time within ${MAX_PLAN_DAYS} days.`;
  }
  return null;
}

interface Plannable {
  presence: Presence;
  presenceUpdatedAt: string | null;
  plannedPresence: Presence | null;
  plannedAt: string | null;
  plannedPrecision: PlanPrecision | null;
}

/** Applies a plan whose time has come, so the UI flips without waiting for the server. */
export function withDuePlan<T extends Plannable>(person: T, now = Date.now()): T {
  if (!person.plannedAt || !person.plannedPresence) return person;
  if (new Date(person.plannedAt).getTime() > now) return person;
  return {
    ...person,
    presence: person.plannedPresence,
    presenceUpdatedAt: person.plannedAt,
    plannedPresence: null,
    plannedAt: null,
    plannedPrecision: null,
  };
}

/** Status line for a person: the plan if there is one. */
export function personPlanLabel(person: Plannable, now = new Date(), locale: Locale = "en") {
  if (!person.plannedAt || !person.plannedPresence) return null;
  return planLabel(
    person.plannedPresence,
    new Date(person.plannedAt),
    person.plannedPrecision ?? "exact",
    now,
    locale,
  );
}
