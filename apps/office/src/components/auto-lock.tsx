"use client";

import { useEffect, useRef } from "react";
import { useApp } from "@/components/app-provider";
import { hideNow } from "@/lib/hide";

/**
 * Locks the app (back to the Day Planner) after the user's chosen idle time.
 * Time spent with the app in the background counts as idle. Also: Esc pressed
 * twice quickly hides the app on a computer.
 */
export function AutoLock() {
  const { state } = useApp();
  const minutes = state?.me.autoLockMinutes ?? 5;
  const lastActivity = useRef(0);
  const lastEscape = useRef(0);

  useEffect(() => {
    // The idle clock starts when the app opens (or the setting changes).
    lastActivity.current = Date.now();
    const touch = () => {
      lastActivity.current = Date.now();
    };
    const check = () => {
      if (Date.now() - lastActivity.current > minutes * 60_000) hideNow();
    };
    const onVisibility = () => document.visibilityState === "visible" && check();
    const onKey = (e: KeyboardEvent) => {
      touch();
      if (e.key !== "Escape") return;
      if (Date.now() - lastEscape.current < 600) hideNow();
      lastEscape.current = Date.now();
    };
    const events = ["pointerdown", "touchstart", "wheel", "scroll", "input"] as const;
    for (const name of events)
      window.addEventListener(name, touch, { passive: true, capture: true });
    window.addEventListener("keydown", onKey, { capture: true });
    document.addEventListener("visibilitychange", onVisibility);
    const timer = setInterval(check, 10_000);
    return () => {
      for (const name of events) window.removeEventListener(name, touch, { capture: true });
      window.removeEventListener("keydown", onKey, { capture: true });
      document.removeEventListener("visibilitychange", onVisibility);
      clearInterval(timer);
    };
  }, [minutes]);

  return null;
}
