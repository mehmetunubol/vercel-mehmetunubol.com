"use client";

import { useEffect, useSyncExternalStore } from "react";
import { signOut } from "next-auth/react";
import { clearIdentities } from "@/lib/keystore";
import { clearSessionLive, isSessionLive } from "@/lib/live-session";

const noSubscribe = () => () => {};

/** Signs out if this tab/app wasn't the one that signed in (it was closed and reopened). */
export function SessionGuard({ children }: { children: React.ReactNode }) {
  const live = useSyncExternalStore(noSubscribe, isSessionLive, () => false);

  useEffect(() => {
    // Read storage directly: the first (hydration) render always reports false.
    if (isSessionLive()) return;
    clearSessionLive();
    void clearIdentities()
      .then(() => signOut({ redirect: false }))
      .finally(() => window.location.replace("/"));
  }, [live]);

  // Render nothing until the check passes, so private content never flashes.
  return live ? children : <div className="min-h-dvh" />;
}
