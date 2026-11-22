"use client";

import { useState, useTransition } from "react";
import { Ban, Trash2 } from "lucide-react";
import { purgeAllMessages, setSignInsDisabled } from "@/app/(app)/admin/actions";

export function EmergencyPanel({ loginsDisabled }: { loginsDisabled: boolean }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function run(confirmText: string, action: () => Promise<{ ok: boolean; message?: string }>) {
    if (!window.confirm(confirmText)) return;
    startTransition(async () => {
      const result = await action();
      setMessage({ ok: result.ok, text: result.message ?? "Done." });
    });
  }

  return (
    <div className="space-y-3 px-3 pb-3">
      <div className="rounded-2xl border border-[color-mix(in_oklab,var(--danger)_30%,transparent)] p-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Trash2 size={15} /> Delete all messages
        </p>
        <p className="mt-1 text-xs text-[var(--ink-2)]">
          Permanently deletes every message in every chat, right now. Conversations and groups stay.
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
          Delete all messages now
        </button>
      </div>

      <div className="rounded-2xl border border-[color-mix(in_oklab,var(--danger)_30%,transparent)] p-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Ban size={15} /> {loginsDisabled ? "Sign-ins are disabled" : "Disable sign-ins"}
        </p>
        <p className="mt-1 text-xs text-[var(--ink-2)]">
          {loginsDisabled
            ? 'Nobody but you can sign in. Others see the normal "account locked, try again in 15 minutes" message.'
            : 'Signs everyone except you out now and blocks new sign-ins. They\'ll see the normal "account locked" message.'}
        </p>
        {loginsDisabled ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run("Allow everyone to sign in again?", () => setSignInsDisabled(false))}
            className="btn btn-primary btn-sm mt-3"
          >
            Enable sign-ins again
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
            Disable all sign-ins
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
