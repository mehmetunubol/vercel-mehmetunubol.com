"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { setupIdentity } from "@/lib/client-keys";
import { clearIdentities } from "@/lib/keystore";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"idle" | "signing-in" | "keys">("idle");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const username = String(form.get("username") ?? "")
      .trim()
      .toLowerCase();
    const password = String(form.get("password") ?? "");
    setError(null);
    setStep("signing-in");

    const result = await signIn("credentials", { username, password, redirect: false }).catch(
      () => null,
    );
    if (!result || result.error) {
      setStep("idle");
      setError(
        "That username and password don't match. After 5 failed attempts the account pauses for 15 minutes.",
      );
      return;
    }

    setStep("keys");
    try {
      await clearIdentities();
      await setupIdentity(password);
      window.location.replace("/");
    } catch (e) {
      setStep("idle");
      setError(e instanceof Error ? e.message : "Couldn't prepare encryption keys.");
    }
  }

  const busy = step !== "idle";
  return (
    <form onSubmit={onSubmit} className="glass-strong space-y-3 rounded-[1.75rem] p-5">
      <label className="block space-y-1.5">
        <span className="eyebrow">Username</span>
        <input
          name="username"
          required
          autoFocus
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoComplete="username"
          className="field"
        />
      </label>
      <label className="block space-y-1.5">
        <span className="eyebrow">Password</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="field"
        />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={busy} className="btn btn-primary mt-2 w-full py-3">
        {step === "signing-in"
          ? "Signing in…"
          : step === "keys"
            ? "Unlocking messages…"
            : "Sign in"}
      </button>
    </form>
  );
}
