"use client";

import { useRef, useState } from "react";
import { LoginForm } from "@/components/login-form";

const TAPS_TO_OPEN = 3;
const MAX_GAP_MS = 800;

/**
 * Decoy front page shown to anyone who isn't signed in. Tapping the notice
 * reference three times in quick succession reveals the sign-in form.
 * This hides the app from casual visitors; it is not a security boundary
 * (the real one is the password and the encryption).
 */
export function Gate() {
  const [open, setOpen] = useState(false);
  const taps = useRef<{ count: number; last: number }>({ count: 0, last: 0 });

  function onSecretTap() {
    const now = Date.now();
    const t = taps.current;
    t.count = now - t.last <= MAX_GAP_MS ? t.count + 1 : 1;
    t.last = now;
    if (t.count >= TAPS_TO_OPEN) {
      t.count = 0;
      setOpen(true);
    }
  }

  if (open) {
    return (
      <main className="safe-top safe-bottom flex min-h-dvh flex-col items-center justify-center px-5">
        <div className="rise w-full max-w-sm">
          <LoginForm />
        </div>
      </main>
    );
  }

  return (
    <main className="safe-top safe-bottom mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 pt-10 pb-8">
      <p className="eyebrow">Building notice</p>
      <h1 className="mt-2 text-[2rem] leading-tight font-semibold">
        This office is closed for renovation
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-[var(--ink-2)]">
        The team has moved to remote work while the floor is rebuilt. The office at this address is
        not staffed and is expected to reopen in{" "}
        <span className="font-medium text-[var(--ink)]">March 2027</span>.
      </p>

      <section className="glass-strong mt-8 rounded-[1.75rem] p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="eyebrow">Renovation progress</h2>
          <span className="text-sm font-semibold tabular-nums">35%</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--field)]">
          <div className="h-full w-[35%] rounded-full bg-[var(--ink-2)]" />
        </div>
        <ul className="mt-4 space-y-2 text-sm text-[var(--ink-2)]">
          <li className="flex justify-between gap-4">
            <span>Electrical and network cabling</span>
            <span className="text-[var(--ink-3)]">In progress</span>
          </li>
          <li className="flex justify-between gap-4">
            <span>Flooring and acoustic panels</span>
            <span className="text-[var(--ink-3)]">January</span>
          </li>
          <li className="flex justify-between gap-4">
            <span>Furniture and move-in</span>
            <span className="text-[var(--ink-3)]">March</span>
          </li>
        </ul>
      </section>

      <section className="glass mt-4 divide-y divide-[var(--hairline)] rounded-[1.75rem] px-5">
        {[
          ["Visitors", "No meetings are held on site until the office reopens."],
          [
            "Deliveries",
            "Reception can't accept parcels for this office. Please hold them until reopening.",
          ],
          ["Post", "Letters are collected once a month."],
          ["Parking", "Visitor spaces are closed during the works."],
        ].map(([title, body]) => (
          <div key={title} className="py-4">
            <h3 className="text-sm font-semibold">{title}</h3>
            <p className="mt-0.5 text-sm text-[var(--ink-2)]">{body}</p>
          </div>
        ))}
      </section>

      <footer className="mt-auto pt-10 text-xs text-[var(--ink-3)]">
        <p>Thank you for your patience.</p>
        {/* The secret: three quick taps here open sign-in. Styled as plain text on purpose. */}
        <p onClick={onSecretTap} className="mt-1 inline-block cursor-default py-1 select-none">
          Facilities · Notice ref. FM-2611
        </p>
      </footer>
    </main>
  );
}
