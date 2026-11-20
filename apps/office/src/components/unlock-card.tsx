"use client";

import { useState } from "react";
import { LockKeyhole } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { setupIdentity } from "@/lib/client-keys";

/** Shown when this browser doesn't hold the user's private key (new device, cleared storage). */
export function UnlockCard() {
  const { setIdentity } = useApp();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    setBusy(true);
    setError(null);
    try {
      setIdentity(await setupIdentity(password));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't unlock.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="glass-strong rise mx-auto w-full max-w-sm space-y-3 rounded-[1.75rem] p-5"
    >
      <div className="flex items-center gap-2">
        <LockKeyhole size={18} />
        <h2 className="font-semibold">Unlock messages on this device</h2>
      </div>
      <p className="text-sm text-[var(--ink-2)]">
        Messages are end-to-end encrypted. Enter your password to unlock your key in this browser.
      </p>
      <input
        name="password"
        type="password"
        required
        autoComplete="current-password"
        className="field"
        placeholder="Password"
      />
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      <button type="submit" disabled={busy} className="btn btn-primary w-full">
        {busy ? "Unlocking…" : "Unlock"}
      </button>
    </form>
  );
}
