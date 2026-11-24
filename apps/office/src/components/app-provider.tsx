"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { backoff, onWake } from "@/lib/activity";
import type { Identity } from "@/lib/crypto";
import { loadIdentity } from "@/lib/keystore";
import type { AppState, ChatSummary, Person } from "@/lib/types";

interface AppContextValue {
  state: AppState | null;
  identity: Identity | null;
  identityStatus: "loading" | "ready" | "locked";
  setIdentity: (identity: Identity) => void;
  refresh: () => Promise<void>;
  patchPeople: (fn: (people: Person[]) => Person[]) => void;
  personById: (id: string) => Person | undefined;
  chatTitle: (chat: ChatSummary) => string;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp outside AppProvider");
  return value;
}

/**
 * Polls while the page is visible; pauses when hidden. `interval` may be a
 * function, re-evaluated before each wait, so callers can slow down when idle.
 * Coming back after being idle triggers an immediate check.
 */
export function usePolling(fn: () => void | Promise<void>, interval: number | (() => number)) {
  const ref = useRef(fn);
  const delay = useRef(interval);
  useEffect(() => {
    ref.current = fn;
    delay.current = interval;
  });
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const next = () => (typeof delay.current === "function" ? delay.current() : delay.current);
    const tick = async () => {
      if (stopped) return;
      if (document.visibilityState === "visible") {
        try {
          await ref.current();
        } catch {
          // transient network error; try again next tick
        }
      }
      if (!stopped) timer = setTimeout(tick, next());
    };
    const now = () => {
      if (document.visibilityState === "visible") {
        clearTimeout(timer);
        void tick();
      }
    };
    void tick();
    document.addEventListener("visibilitychange", now);
    const stopWake = onWake(now);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", now);
      stopWake();
    };
  }, []);
}

export function AppProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const [stored, setStored] = useState<Identity | null | undefined>(undefined);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/state", { cache: "no-store" });
    if (response.status === 401) {
      window.location.href = "/";
      return;
    }
    if (response.ok) setState((await response.json()) as AppState);
  }, []);

  usePolling(refresh, () => backoff(5000));

  // Tell the server right away when the app goes to the background or closes,
  // so others see "Last seen …" within seconds instead of after the 30 s window.
  useEffect(() => {
    const away = () => navigator.sendBeacon?.("/api/me/away");
    const onVisibility = () => document.visibilityState === "hidden" && away();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", away);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", away);
    };
  }, []);

  useEffect(() => {
    void loadIdentity(userId).then(setStored);
  }, [userId]);

  // The stored key is only valid if it still matches the server's public key
  // (an admin password reset issues a new key pair).
  const identity = stored && state && stored.publicKey === state.me.publicKey ? stored : null;

  const identityStatus: AppContextValue["identityStatus"] = identity
    ? "ready"
    : stored === undefined || !state
      ? "loading"
      : "locked";

  const value = useMemo<AppContextValue>(() => {
    const byId = new Map(state?.people.map((p) => [p.id, p]));
    return {
      state,
      identity,
      identityStatus,
      setIdentity: (next) => {
        setStored(next);
        void refresh();
      },
      refresh,
      patchPeople: (fn) => setState((s) => (s ? { ...s, people: fn(s.people) } : s)),
      personById: (id) => byId.get(id),
      chatTitle: (chat) => {
        if (chat.kind === "group") return chat.name ?? "Group";
        const otherId = chat.memberIds.find((id) => id !== state?.me.id);
        return (otherId && byId.get(otherId)?.displayName) || "Private chat";
      },
    };
  }, [state, identity, identityStatus, refresh]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/** The current time, refreshed every `intervalMs` so time-based labels stay current. */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
