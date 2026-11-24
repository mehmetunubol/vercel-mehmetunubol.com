"use client";

import { clearIdentities } from "@/lib/keystore";
import { clearSessionLive } from "@/lib/live-session";

/**
 * Quick hide / auto-lock: leave the app instantly and land on the Day Planner.
 * Dropping the live-session markers makes the server treat this browser as
 * signed out at once; the message key on this device is wiped too, so coming
 * back needs the password.
 */
export function hideNow() {
  navigator.sendBeacon?.("/api/me/away");
  clearSessionLive();
  // Don't wait: the planner should appear immediately. Sign-in clears keys again anyway.
  void clearIdentities();
  window.location.replace("/");
}

export const AUTO_LOCK_CHOICES = [1, 5, 15, 30] as const;
