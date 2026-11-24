"use client";

import { useState } from "react";
import { CalendarClock, X } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { PresencePlanner } from "@/components/presence-planner";
import { sinceLabel } from "@/lib/format";
import { exactLabel, opposite, personPlanLabel, withDuePlan } from "@/lib/plan";
import type { Person, PlanPrecision, Presence } from "@/lib/types";
import { useI18n } from "@/components/i18n-provider";

type PresenceBody = { presence?: Presence; plan?: { at: string; precision: PlanPrecision } | null };

export function PresenceCard() {
  const { t, locale } = useI18n();
  const { state, patchPeople } = useApp();
  const [saving, setSaving] = useState(false);
  const [planning, setPlanning] = useState(false);
  const raw = state?.people.find((p) => p.id === state.me.id);
  const me = raw ? withDuePlan(raw) : undefined;
  const presence: Presence = me?.presence ?? "out";

  /** Sends an update; patches the local copy optimistically and returns an error message on failure. */
  async function update(body: PresenceBody, optimistic: Partial<Person>): Promise<string | null> {
    if (!state || !me) return t("Not ready yet.");
    const previous = me;
    const patch = (fields: Partial<Person>) =>
      patchPeople((people) => people.map((p) => (p.id === state.me.id ? { ...p, ...fields } : p)));
    patch(optimistic);
    try {
      const response = await fetch("/api/me/presence", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json().catch(() => ({}))) as Partial<Person> & {
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? t("Couldn't save."));
      patch({
        presence: data.presence,
        presenceUpdatedAt: data.presenceUpdatedAt ?? null,
        plannedPresence: data.plannedPresence ?? null,
        plannedAt: data.plannedAt ?? null,
        plannedPrecision: data.plannedPrecision ?? null,
      });
      return null;
    } catch (e) {
      patch(previous);
      return e instanceof Error ? e.message : t("Couldn't save.");
    }
  }

  async function setNow(next: Presence) {
    if (saving || next === presence) return;
    setSaving(true);
    setPlanning(false);
    await update(
      { presence: next },
      {
        presence: next,
        presenceUpdatedAt: new Date().toISOString(),
        plannedPresence: null,
        plannedAt: null,
        plannedPrecision: null,
      },
    );
    setSaving(false);
  }

  async function savePlan(plan: { at: Date; precision: PlanPrecision }) {
    const error = await update(
      { plan: { at: plan.at.toISOString(), precision: plan.precision } },
      {
        plannedPresence: opposite(presence),
        plannedAt: plan.at.toISOString(),
        plannedPrecision: plan.precision,
      },
    );
    if (!error) setPlanning(false);
    return error;
  }

  const planText = me ? personPlanLabel(me, undefined, locale) : null;
  const target = opposite(presence);

  return (
    <section className="glass-strong rise rounded-[1.75rem] p-5">
      <p className="eyebrow">{t("Your status")}</p>
      <h2 className="mt-2 text-[1.75rem] leading-tight font-semibold">
        {me ? (presence === "in" ? t("In the office") : t("Out of the office")) : " "}
      </h2>
      <p className="mt-1 text-sm text-[var(--ink-2)]">
        {me?.presenceUpdatedAt
          ? sinceLabel(me.presenceUpdatedAt) === "just now"
            ? t("Updated just now")
            : t("Updated {since} ago", {
                since: sinceLabel(me.presenceUpdatedAt, undefined, locale),
              })
          : t("Let people know where you are.")}
      </p>
      <div
        className="presence-switch mt-5"
        data-value={presence}
        role="group"
        aria-label={t("Your status")}
      >
        <span className="thumb" aria-hidden="true" />
        <button type="button" aria-pressed={presence === "in"} onClick={() => setNow("in")}>
          <span className="dot dot-in" /> {t("In")}
        </button>
        <button type="button" aria-pressed={presence === "out"} onClick={() => setNow("out")}>
          <span className="dot dot-out" /> {t("Out")}
        </button>
      </div>

      {me && !planning ? (
        planText && me.plannedAt ? (
          <div className="mt-3 flex items-center gap-3 rounded-2xl bg-[var(--field)] py-2.5 pr-2 pl-3.5">
            <CalendarClock size={18} className="shrink-0 text-[var(--ink-2)]" />
            <button
              type="button"
              onClick={() => setPlanning(true)}
              className="min-w-0 flex-1 text-left"
            >
              <span className="block truncate text-sm font-semibold">{planText}</span>
              <span className="block truncate text-xs text-[var(--ink-3)] tabular-nums">
                {exactLabel(new Date(me.plannedAt), undefined, locale)} · {t("tap to change")}
              </span>
            </button>
            <button
              type="button"
              aria-label={t("Cancel scheduled change")}
              onClick={() =>
                void update(
                  { plan: null },
                  { plannedPresence: null, plannedAt: null, plannedPrecision: null },
                )
              }
              className="grid size-9 shrink-0 place-items-center rounded-full text-[var(--ink-2)] hover:bg-[var(--hairline)]"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setPlanning(true)}
            className="mt-3 flex w-full items-center gap-2 rounded-2xl px-3.5 py-2.5 text-sm text-[var(--ink-2)] transition-colors hover:bg-[var(--field)] hover:text-[var(--ink)]"
          >
            <CalendarClock size={18} />
            {target === "in" ? t("Set when you'll be in") : t("Set when you'll leave")}
          </button>
        )
      ) : null}

      {me && planning ? (
        <PresencePlanner
          target={target}
          initial={
            me.plannedAt && me.plannedPresence === target
              ? { at: new Date(me.plannedAt), precision: me.plannedPrecision ?? "exact" }
              : null
          }
          onSave={savePlan}
          onCancel={() => setPlanning(false)}
        />
      ) : null}
    </section>
  );
}
