"use client";

import { useState, useTransition } from "react";
import { Ban, CalendarX, Trash2 } from "lucide-react";
import {
  type ActionResult,
  purgeAllEvents,
  purgeAllMessages,
  setSignInsDisabled,
} from "@/app/(app)/admin/actions";
import { useI18n } from "@/components/i18n-provider";

export function EmergencyPanel({ loginsDisabled }: { loginsDisabled: boolean }) {
  const [pending, startTransition] = useTransition();
  const { t } = useI18n();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function run(confirmText: string, action: () => Promise<ActionResult>) {
    if (!window.confirm(t(confirmText))) return;
    startTransition(async () => {
      const result = await action();
      setMessage({ ok: result.ok, text: t(result.message ?? "Done.", result.vars) });
    });
  }

  return (
    <div className="space-y-3 px-3 pb-3">
      <div className="rounded-2xl border border-[color-mix(in_oklab,var(--danger)_30%,transparent)] p-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Trash2 size={15} /> {t("Delete all messages")}
        </p>
        <p className="mt-1 text-xs text-[var(--ink-2)]">
          {t(
            "Permanently deletes every message in every chat, right now. Conversations and groups stay.",
          )}
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run("Delete ALL messages in every chat? This can't be undone.", () =>
              purgeAllMessages(),
            )
          }
          className="btn btn-danger btn-sm mt-3"
        >
          {t("Delete all messages now")}
        </button>
      </div>

      <div className="rounded-2xl border border-[color-mix(in_oklab,var(--danger)_30%,transparent)] p-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <CalendarX size={15} /> {t("Delete all events")}
        </p>
        <p className="mt-1 text-xs text-[var(--ink-2)]">
          {t(
            "Permanently deletes every event, past and upcoming, with all invitations and answers.",
          )}
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run("Delete ALL events for everyone? This can't be undone.", () => purgeAllEvents())
          }
          className="btn btn-danger btn-sm mt-3"
        >
          {t("Delete all events now")}
        </button>
      </div>

      <div className="rounded-2xl border border-[color-mix(in_oklab,var(--danger)_30%,transparent)] p-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Ban size={15} /> {loginsDisabled ? t("Sign-ins are disabled") : t("Disable sign-ins")}
        </p>
        <p className="mt-1 text-xs text-[var(--ink-2)]">
          {loginsDisabled
            ? t(
                "Nobody but you can sign in. Others see the normal “account locked, try again in 15 minutes” message.",
              )
            : t(
                "Signs everyone except you out now and blocks new sign-ins. They’ll see the normal “account locked” message.",
              )}
        </p>
        {loginsDisabled ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run("Allow everyone to sign in again?", () => setSignInsDisabled(false))}
            className="btn btn-primary btn-sm mt-3"
          >
            {t("Enable sign-ins again")}
          </button>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              run("Disable sign-ins and sign everyone else out now?", () =>
                setSignInsDisabled(true),
              )
            }
            className="btn btn-danger btn-sm mt-3"
          >
            {t("Disable all sign-ins")}
          </button>
        )}
      </div>

      {message ? (
        <p
          role="status"
          className={message.ok ? "text-sm text-[var(--ink-2)]" : "text-sm text-[var(--danger)]"}
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
