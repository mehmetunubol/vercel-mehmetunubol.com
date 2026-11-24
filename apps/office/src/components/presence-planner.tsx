"use client";

import { useMemo, useState } from "react";
import { cn } from "@repo/ui";
import {
  clock,
  dateFromParts,
  exactLabel,
  MAX_PLAN_DAYS,
  planLabel,
  planProblem,
  toDateInput,
} from "@/lib/plan";
import { durationLabel } from "@/lib/event-time";
import type { PlanPrecision, Presence } from "@/lib/types";
import { useI18n } from "@/components/i18n-provider";

type Mode = "after" | "today" | "day";

const AFTER_OPTIONS = [
  { minutes: 30, label: "30 min" },
  { minutes: 60, label: "1 h" },
  { minutes: 120, label: "2 h" },
  { minutes: 180, label: "3 h" },
  { minutes: 240, label: "4 h" },
];

const PARTS: { value: PlanPrecision; label: string }[] = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
  { value: "exact", label: "Exact time" },
];

function nextFullHour(now: Date) {
  const d = new Date(now);
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d;
}

export function PresencePlanner({
  target,
  initial,
  onSave,
  onCancel,
}: {
  target: Presence;
  initial?: { at: Date; precision: PlanPrecision } | null;
  onSave: (plan: { at: Date; precision: PlanPrecision }) => Promise<string | null>;
  onCancel: () => void;
}) {
  const { t, locale } = useI18n();
  const [now] = useState(() => new Date());
  const tomorrow = useMemo(
    () => new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
    [now],
  );
  const lateEvening = now.getHours() >= 22;

  const [mode, setMode] = useState<Mode>(() => {
    if (!initial) return lateEvening ? "day" : "after";
    const sameDay = toDateInput(initial.at) === toDateInput(now);
    return sameDay && initial.precision === "exact" ? "today" : "day";
  });
  const [minutes, setMinutes] = useState<number | null>(null);
  const [todayTime, setTodayTime] = useState(() =>
    initial && initial.precision === "exact" ? clock(initial.at) : clock(nextFullHour(now)),
  );
  const [day, setDay] = useState(() => toDateInput(initial?.at ?? tomorrow));
  const [part, setPart] = useState<PlanPrecision>(initial?.precision ?? "morning");
  const [exactTime, setExactTime] = useState(() => (initial ? clock(initial.at) : "09:00"));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const candidate = useMemo((): { at: Date; precision: PlanPrecision } | null => {
    if (mode === "after")
      return minutes
        ? { at: new Date(now.getTime() + minutes * 60_000), precision: "exact" }
        : null;
    if (mode === "today") {
      const at = dateFromParts(toDateInput(now), "exact", todayTime);
      return at ? { at, precision: "exact" } : null;
    }
    const at = dateFromParts(day, part, exactTime);
    return at ? { at, precision: part } : null;
  }, [mode, minutes, todayTime, day, part, exactTime, now]);

  const problem = candidate
    ? planProblem(candidate.at)
    : mode === "after"
      ? "Pick how long."
      : "Pick a time.";
  // Problems come from planProblem() in English; t() translates them.

  async function save() {
    if (!candidate || problem) return;
    // "In 1 h" means one hour from now, even if the panel has been open a while.
    const plan =
      mode === "after" && minutes
        ? { at: new Date(Date.now() + minutes * 60_000), precision: "exact" as const }
        : candidate;
    const stale = planProblem(plan.at);
    if (stale) return setError(t(stale));
    setSaving(true);
    setError(await onSave(plan));
    setSaving(false);
  }

  const question = target === "in" ? t("When will you be in?") : t("When will you leave?");
  const maxDay = toDateInput(new Date(now.getTime() + MAX_PLAN_DAYS * 86_400_000));

  return (
    <div className="rise mt-4 space-y-4 rounded-[1.4rem] border border-[var(--hairline)] bg-[var(--field)] p-4">
      <p className="font-semibold">{question}</p>

      <div className="seg" role="tablist" aria-label={t("How to pick the time")}>
        {(
          [
            ["after", "In…"],
            ["today", "Today at"],
            ["day", "Pick a day"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => setMode(value)}
            // Too late today for a "today at" time to be useful.
            disabled={value === "today" && lateEvening}
          >
            {t(label)}
          </button>
        ))}
      </div>

      {mode === "after" ? (
        <div className="flex flex-wrap gap-2">
          {AFTER_OPTIONS.map((option) => (
            <button
              key={option.minutes}
              type="button"
              aria-pressed={minutes === option.minutes}
              onClick={() => setMinutes(option.minutes)}
              className="chip"
            >
              {durationLabel(option.minutes, locale)}
            </button>
          ))}
        </div>
      ) : null}

      {mode === "today" ? (
        <label className="flex items-center gap-3">
          <span className="text-sm text-[var(--ink-2)]">{t("Today at")}</span>
          <input
            type="time"
            value={todayTime}
            onChange={(e) => setTodayTime(e.target.value)}
            className="field w-36 tabular-nums"
            aria-label={t("Time today")}
          />
        </label>
      ) : null}

      {mode === "day" ? (
        <div className="space-y-3">
          <input
            type="date"
            value={day}
            min={toDateInput(now)}
            max={maxDay}
            onChange={(e) => setDay(e.target.value)}
            className="field tabular-nums"
            aria-label={t("Day")}
          />
          <div className="flex flex-wrap gap-2">
            {PARTS.map((p) => (
              <button
                key={p.value}
                type="button"
                aria-pressed={part === p.value}
                onClick={() => setPart(p.value)}
                className="chip"
              >
                {t(p.label)}
              </button>
            ))}
          </div>
          {part === "exact" ? (
            <input
              type="time"
              value={exactTime}
              onChange={(e) => setExactTime(e.target.value)}
              className="field w-36 tabular-nums"
              aria-label={t("Time")}
            />
          ) : (
            <p className="text-xs text-[var(--ink-3)]">
              {t("Morning starts 09:00, afternoon 13:00, evening 18:00.")}
            </p>
          )}
        </div>
      ) : null}

      <div className="min-h-10 text-sm">
        {candidate && !problem ? (
          <p>
            <span className="text-[var(--ink-2)]">{t("Others will see")} </span>
            <span className="font-semibold">
              {planLabel(target, candidate.at, candidate.precision, undefined, locale)}
            </span>
            <span className="block text-xs text-[var(--ink-3)] tabular-nums">
              {t(target === "in" ? "Switches to In on {when}" : "Switches to Out on {when}", {
                when: exactLabel(candidate.at, undefined, locale),
              })}
            </span>
          </p>
        ) : (
          <p className={cn(candidate ? "text-[var(--danger)]" : "text-[var(--ink-3)]")}>
            {problem ? t(problem) : null}
          </p>
        )}
        {error ? <p className="text-[var(--danger)]">{error}</p> : null}
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="btn btn-quiet flex-1">
          {t("Cancel")}
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!!problem || saving}
          className="btn btn-primary flex-1"
        >
          {saving ? t("Saving…") : t("Save")}
        </button>
      </div>
    </div>
  );
}
