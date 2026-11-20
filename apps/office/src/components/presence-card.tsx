"use client";

import { useState } from "react";
import { useApp } from "@/components/app-provider";
import { sinceLabel } from "@/lib/format";
import type { Presence } from "@/lib/types";

export function PresenceCard() {
  const { state, patchPeople } = useApp();
  const [saving, setSaving] = useState(false);
  const me = state?.people.find((p) => p.id === state.me.id);
  const presence: Presence = me?.presence ?? "out";

  async function set(next: Presence) {
    if (!state || saving || next === presence) return;
    setSaving(true);
    const now = new Date().toISOString();
    patchPeople((people) =>
      people.map((p) =>
        p.id === state.me.id ? { ...p, presence: next, presenceUpdatedAt: now } : p,
      ),
    );
    try {
      const response = await fetch("/api/me/presence", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ presence: next }),
      });
      if (!response.ok) throw new Error();
    } catch {
      patchPeople((people) => people.map((p) => (p.id === state.me.id ? { ...p, presence } : p)));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="glass-strong rise rounded-[1.75rem] p-5">
      <p className="eyebrow">Your status</p>
      <h2 className="mt-2 text-[1.75rem] leading-tight font-semibold">
        {me ? (presence === "in" ? "In the office" : "Out of the office") : " "}
      </h2>
      <p className="mt-1 text-sm text-[var(--ink-2)]">
        {me?.presenceUpdatedAt
          ? `Updated ${sinceLabel(me.presenceUpdatedAt)} ago`.replace("just now ago", "just now")
          : "Let people know where you are."}
      </p>
      <div
        className="presence-switch mt-5"
        data-value={presence}
        role="group"
        aria-label="Office status"
      >
        <span className="thumb" aria-hidden="true" />
        <button type="button" aria-pressed={presence === "in"} onClick={() => set("in")}>
          <span className="dot dot-in" /> In
        </button>
        <button type="button" aria-pressed={presence === "out"} onClick={() => set("out")}>
          <span className="dot dot-out" /> Out
        </button>
      </div>
    </section>
  );
}
