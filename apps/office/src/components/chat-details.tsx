"use client";

import { useState } from "react";
import { BellOff, Clock, X } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { ttlLabel } from "@/lib/format";
import type { ChatSummary } from "@/lib/types";

const LIFETIMES: { hours: number | null; label: string }[] = [
  { hours: null, label: "Default" },
  { hours: 1, label: "1 hour" },
  { hours: 8, label: "8 hours" },
  { hours: 24, label: "1 day" },
  { hours: 168, label: "1 week" },
];

const MUTES = [
  { value: "8h", label: "8 hours" },
  { value: "week", label: "1 week" },
  { value: "always", label: "Always" },
] as const;

/** Chat details: members, how long messages last here, and muting. */
export function ChatDetails({
  chat,
  title,
  memberNames,
  onClose,
}: {
  chat: ChatSummary;
  title: string;
  memberNames: string[];
  onClose: () => void;
}) {
  const { state, refresh } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canChangeLifetime = chat.kind === "direct" || state?.me.isAdmin === true;
  const globalHours = state?.ttlHours ?? 24;

  async function save(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/conversations/${chat.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    if (!response?.ok) setError("Couldn't save that.");
    await refresh();
    setBusy(false);
  }

  return (
    <div
      role="dialog"
      aria-label="Chat details"
      className="fixed inset-0 z-40 flex items-end justify-center sm:items-center"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/30"
      />
      <section className="glass-strong rise safe-bottom relative w-full max-w-md space-y-5 rounded-t-[1.75rem] p-5 sm:rounded-[1.75rem]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow">
              {chat.kind === "group"
                ? chat.announcement
                  ? "Announcements"
                  : "Group"
                : "Private chat"}
            </p>
            <h2 className="mt-1 truncate text-xl font-semibold">{title}</h2>
            {chat.kind === "group" ? (
              <p className="mt-1 text-sm text-[var(--ink-2)]">{memberNames.join(", ")}</p>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Close details"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-[var(--hairline)]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <Clock size={15} /> Messages disappear after
          </h3>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Message lifetime">
            {LIFETIMES.map((option) => (
              <button
                key={option.label}
                type="button"
                className="chip"
                disabled={busy || !canChangeLifetime}
                aria-pressed={chat.ttlHours === option.hours}
                onClick={() => void save({ ttlHours: option.hours })}
              >
                {option.hours === null ? `Default (${ttlLabel(globalHours)})` : option.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-[var(--ink-3)]">
            {canChangeLifetime
              ? "Applies to new messages, for everyone in this chat."
              : "Only the admin can change this for a group."}
          </p>
        </div>

        <div className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <BellOff size={15} /> Notifications
          </h3>
          {chat.muted ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-[var(--ink-2)]">Muted</span>
              <button
                type="button"
                className="btn btn-quiet btn-sm"
                disabled={busy}
                onClick={() => void save({ mute: "off" })}
              >
                Unmute
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Mute">
              <span className="text-sm text-[var(--ink-2)]">Mute for</span>
              {MUTES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className="chip"
                  disabled={busy}
                  onClick={() => void save({ mute: option.value })}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-[var(--ink-3)]">
            Only affects you. Muted chats never send a notification.
          </p>
        </div>

        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      </section>
    </div>
  );
}
