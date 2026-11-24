"use client";

/**
 * When the person last touched the app. Polling slows down while they're idle
 * (fewer requests, less database work) and speeds up as soon as they're back.
 */
let lastInteraction = Date.now();
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  const touch = () => {
    const wasIdle = Date.now() - lastInteraction > 30_000;
    lastInteraction = Date.now();
    if (wasIdle) listeners.forEach((fn) => fn());
  };
  for (const name of ["pointerdown", "keydown", "touchstart", "wheel", "scroll"] as const) {
    window.addEventListener(name, touch, { passive: true, capture: true });
  }
}

export function idleMs() {
  return Date.now() - lastInteraction;
}

/** Called when someone comes back after being idle. */
export function onWake(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

const MINUTE = 60_000;

/** Delay for a background check: normal while active, slower when idle. */
export function backoff(activeMs: number, idle = idleMs()) {
  if (idle < 2 * MINUTE) return activeMs;
  if (idle < 5 * MINUTE) return Math.max(activeMs, 15_000);
  return Math.max(activeMs, 30_000);
}
