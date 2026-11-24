"use client";

import { useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { LockKeyhole, LogOut } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { Avatar } from "@/components/avatar";
import { NotificationsCard } from "@/components/notifications-card";
import { rewrapPrivateKey } from "@/lib/crypto";
import { clearIdentities } from "@/lib/keystore";
import { clearSessionLive } from "@/lib/live-session";
import { MIN_PASSWORD_LENGTH } from "@/lib/constants";

export function AccountView() {
  const { state } = useApp();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const currentPassword = String(form.get("current") ?? "");
    const newPassword = String(form.get("next") ?? "");
    if (newPassword !== String(form.get("confirm") ?? "")) {
      setMessage({ ok: false, text: "The new passwords don't match." });
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setMessage({ ok: false, text: `Use at least ${MIN_PASSWORD_LENGTH} characters.` });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const keys = (await (await fetch("/api/me/keys", { cache: "no-store" })).json()) as {
        encryptedPrivateKey: string | null;
      };
      let encryptedPrivateKey: string | null = null;
      if (keys.encryptedPrivateKey) {
        try {
          encryptedPrivateKey = await rewrapPrivateKey(
            keys.encryptedPrivateKey,
            currentPassword,
            newPassword,
          );
        } catch {
          throw new Error("Current password is incorrect.");
        }
      }
      const response = await fetch("/api/me/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, encryptedPrivateKey }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Couldn't change your password.");
      // Other sessions were revoked; sign this one back in with the new password.
      await signIn("credentials", {
        username: state?.me.username,
        password: newPassword,
        redirect: false,
      });
      formEl.reset();
      setMessage({ ok: true, text: "Password changed. Other devices have been signed out." });
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Something went wrong." });
    } finally {
      setBusy(false);
    }
  }

  async function logOut() {
    await clearIdentities();
    clearSessionLive();
    await signOut({ redirectTo: "/" });
  }

  return (
    <main className="safe-top mx-auto w-full max-w-lg space-y-4 px-4 pb-32 sm:px-6">
      <header className="pt-4 pb-1">
        <p className="eyebrow">Account</p>
        <h1 className="mt-1 text-3xl font-semibold">You</h1>
      </header>

      <section className="glass-strong rise flex items-center gap-4 rounded-[1.75rem] p-5">
        {state ? <Avatar name={state.me.displayName} size={56} /> : <span className="size-14" />}
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{state?.me.displayName ?? " "}</p>
          <p className="truncate text-sm text-[var(--ink-2)]">@{state?.me.username}</p>
        </div>
      </section>

      <form
        onSubmit={changePassword}
        className="glass rise space-y-3 rounded-[1.75rem] p-5"
        style={{ animationDelay: "60ms" }}
      >
        <h2 className="eyebrow">Change password</h2>
        <input
          name="current"
          type="password"
          required
          autoComplete="current-password"
          placeholder="Current password"
          className="field"
        />
        <input
          name="next"
          type="password"
          required
          autoComplete="new-password"
          placeholder="New password"
          className="field"
        />
        <input
          name="confirm"
          type="password"
          required
          autoComplete="new-password"
          placeholder="Repeat new password"
          className="field"
        />
        {message ? (
          <p
            role="status"
            className={message.ok ? "text-sm text-[var(--ink-2)]" : "text-sm text-[var(--danger)]"}
          >
            {message.text}
          </p>
        ) : null}
        <button type="submit" disabled={busy} className="btn btn-primary">
          {busy ? "Changing…" : "Change password"}
        </button>
      </form>

      <NotificationsCard />

      <section
        className="glass rise space-y-3 rounded-[1.75rem] p-5"
        style={{ animationDelay: "120ms" }}
      >
        <h2 className="eyebrow flex items-center gap-1.5">
          <LockKeyhole size={12} /> Privacy
        </h2>
        <p className="text-sm leading-relaxed text-[var(--ink-2)]">
          Messages are encrypted on your device before they&rsquo;re sent and can only be read by
          the people in the conversation. Your key is protected by your password. If an admin resets
          your password, earlier messages to you can no longer be read.
        </p>
        <OnlineStatusToggle />
      </section>

      <button type="button" onClick={logOut} className="btn btn-quiet w-full py-3">
        <LogOut size={18} /> Sign out
      </button>
    </main>
  );
}

/** "Show when I'm online": reciprocal, so hiding yours hides everyone else's from you. */
function OnlineStatusToggle() {
  const { state, refresh } = useApp();
  const [saving, setSaving] = useState(false);
  // Flip the switch immediately; the server's answer replaces it after refresh.
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  if (!state) return null;
  const showing = optimistic ?? !state.me.hideOnline;

  async function toggle() {
    setSaving(true);
    setOptimistic(!showing);
    await fetch("/api/me/privacy", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ hideOnline: showing }),
    }).catch(() => {});
    await refresh();
    setOptimistic(null);
    setSaving(false);
  }

  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--hairline)] bg-[var(--field)] p-3">
      <input
        type="checkbox"
        name="showOnline"
        checked={showing}
        disabled={saving}
        onChange={() => void toggle()}
        className="mt-0.5 size-4 accent-[var(--ink)]"
      />
      <span>
        <span className="block text-sm font-medium">Show when I&rsquo;m online</span>
        <span className="block text-xs text-[var(--ink-2)]">
          Others see when you have the app open, when you were last seen, and when you&rsquo;re
          typing. If you turn this off, you won&rsquo;t see theirs either.
        </span>
      </span>
    </label>
  );
}
