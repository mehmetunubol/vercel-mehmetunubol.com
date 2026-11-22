"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { cn } from "@repo/ui";
import { useApp, useNow } from "@/components/app-provider";
import { dayHeading, durationLabel, timeRange } from "@/lib/event-time";
import { clock, toDateInput } from "@/lib/plan";
import type { EventItem } from "@/lib/types";

const DURATIONS = [15, 30, 45, 60, 90, 120, 180];
const MAX_DESCRIPTION = 500;

function nextHalfHour(now = new Date()) {
  const d = new Date(now);
  d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0);
  return d;
}

export function EventForm({
  existing,
  initialDay,
}: {
  existing?: EventItem;
  initialDay?: string | null;
}) {
  const router = useRouter();
  const { state } = useApp();
  const meId = state?.me.id ?? "";
  const now = useNow();
  const start = existing ? new Date(existing.startsAt) : nextHalfHour();

  const [title, setTitle] = useState(existing?.title ?? "");
  const [day, setDay] = useState(
    existing ? toDateInput(start) : (initialDay ?? toDateInput(start)),
  );
  const [time, setTime] = useState(clock(start));
  const initialDuration = existing?.durationMinutes ?? 60;
  const [duration, setDuration] = useState(initialDuration);
  const [customDuration, setCustomDuration] = useState(!DURATIONS.includes(initialDuration));
  const [description, setDescription] = useState(existing?.description ?? "");
  const [invitees, setInvitees] = useState<Set<string>>(
    () =>
      new Set(
        existing?.invites.map((i) => i.userId).filter((id) => id !== existing.createdBy) ?? [],
      ),
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const others = useMemo(
    () =>
      (state?.people ?? [])
        .filter((p) => p.id !== meId)
        .sort((a, b) => a.displayName.localeCompare(b.displayName)),
    [state, meId],
  );

  const startsAt = useMemo(() => {
    const d = new Date(`${day}T${time}`);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [day, time]);

  const problem = !title.trim()
    ? "Give the event a title."
    : !startsAt
      ? "Pick a date and time."
      : !existing && startsAt.getTime() < now - 5 * 60_000
        ? "That time has already passed."
        : duration < 5 || duration > 24 * 60
          ? "Duration must be between 5 minutes and 24 hours."
          : null;

  const toggle = (id: string) =>
    setInvitees((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allSelected = others.length > 0 && others.every((p) => invitees.has(p.id));

  async function save() {
    if (problem || !startsAt) return setError(problem);
    setBusy(true);
    setError(null);
    const response = await fetch(existing ? `/api/events/${existing.id}` : "/api/events", {
      method: existing ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        startsAt: startsAt.toISOString(),
        durationMinutes: duration,
        inviteeIds: [...invitees],
      }),
    }).catch(() => null);
    const data = (await response?.json().catch(() => ({}))) as { error?: string } | undefined;
    if (!response?.ok) {
      setBusy(false);
      return setError(data?.error ?? "Couldn't save the event.");
    }
    router.push("/events");
    router.refresh();
  }

  async function cancelEvent() {
    if (
      !existing ||
      !window.confirm(`Cancel "${existing.title}"? Everyone invited will no longer see it.`)
    )
      return;
    setBusy(true);
    const response = await fetch(`/api/events/${existing.id}`, { method: "DELETE" }).catch(
      () => null,
    );
    if (!response?.ok) {
      setBusy(false);
      return setError("Couldn't cancel the event.");
    }
    router.push("/events");
    router.refresh();
  }

  return (
    <main className="safe-top mx-auto w-full max-w-xl space-y-4 px-4 pb-32 sm:px-6">
      <header className="pt-4 pb-1">
        <p className="eyebrow">{existing ? "Edit event" : "New event"}</p>
        <h1 className="mt-1 text-3xl font-semibold">
          {existing ? existing.title : "Plan something"}
        </h1>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        className="space-y-4"
      >
        <section className="glass-strong rise space-y-4 rounded-[1.75rem] p-5">
          <label className="block space-y-1.5">
            <span className="eyebrow">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 80))}
              placeholder="Team lunch, planning session…"
              className="field"
              autoFocus={!existing}
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="block space-y-1.5">
              <span className="eyebrow">Date</span>
              <input
                type="date"
                value={day}
                min={existing ? undefined : toDateInput(new Date())}
                onChange={(e) => setDay(e.target.value)}
                className="field min-w-0 px-3 tabular-nums"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="eyebrow">Starts</span>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="field min-w-0 px-3 tabular-nums"
              />
            </label>
          </div>

          <fieldset className="space-y-2">
            <legend className="eyebrow mb-1.5">Estimated duration</legend>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={!customDuration && duration === m}
                  onClick={() => {
                    setCustomDuration(false);
                    setDuration(m);
                  }}
                  className="chip"
                >
                  {durationLabel(m)}
                </button>
              ))}
              <button
                type="button"
                aria-pressed={customDuration}
                onClick={() => setCustomDuration(true)}
                className="chip"
              >
                Other
              </button>
            </div>
            {customDuration ? (
              <label className="flex items-center gap-2">
                <input
                  type="number"
                  min={5}
                  max={1440}
                  step={5}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="field w-28 tabular-nums"
                  aria-label="Duration in minutes"
                />
                <span className="text-sm text-[var(--ink-2)]">minutes</span>
              </label>
            ) : null}
          </fieldset>

          {startsAt && duration >= 5 ? (
            <p className="text-sm text-[var(--ink-2)] tabular-nums">
              {dayHeading(startsAt)} · {timeRange(startsAt, duration)}
            </p>
          ) : null}
        </section>

        <section
          className="glass rise space-y-2 rounded-[1.75rem] p-5"
          style={{ animationDelay: "60ms" }}
        >
          <div className="flex items-baseline justify-between">
            <span className="eyebrow">Description</span>
            <span className="text-xs text-[var(--ink-3)] tabular-nums">
              Optional · {description.length}/{MAX_DESCRIPTION}
            </span>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION))}
            rows={3}
            placeholder="Where, what to bring, agenda…"
            className="field resize-none"
            aria-label="Description"
          />
        </section>

        <section
          className="glass rise space-y-3 rounded-[1.75rem] p-5"
          style={{ animationDelay: "120ms" }}
        >
          <div className="flex items-baseline justify-between">
            <span className="eyebrow">Invite · {invitees.size}</span>
            {others.length > 1 ? (
              <button
                type="button"
                onClick={() =>
                  setInvitees(allSelected ? new Set() : new Set(others.map((p) => p.id)))
                }
                className="text-xs font-semibold text-[var(--ink-2)] hover:text-[var(--ink)]"
              >
                {allSelected ? "Clear" : "Everyone"}
              </button>
            ) : null}
          </div>
          {others.length === 0 ? (
            <p className="text-sm text-[var(--ink-2)]">No one else to invite yet.</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {others.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={invitees.has(p.id)}
                onClick={() => toggle(p.id)}
                className="chip"
              >
                {p.displayName}
              </button>
            ))}
          </div>
          {existing ? (
            <p className="text-xs text-[var(--ink-3)]">
              Changing the date, time or duration asks everyone to answer again.
            </p>
          ) : null}
        </section>

        {error ? (
          <p role="alert" className="px-1 text-sm text-[var(--danger)]">
            {error}
          </p>
        ) : null}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.push("/events")}
            className="btn btn-quiet flex-1"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={busy || !!problem}
            className={cn("btn btn-primary flex-1")}
          >
            {busy ? "Saving…" : existing ? "Save changes" : "Create event"}
          </button>
        </div>
        {problem && title ? <p className="px-1 text-xs text-[var(--ink-3)]">{problem}</p> : null}

        {existing ? (
          <button
            type="button"
            onClick={() => void cancelEvent()}
            disabled={busy}
            className="btn btn-danger w-full"
          >
            Cancel event
          </button>
        ) : null}
      </form>
    </main>
  );
}
