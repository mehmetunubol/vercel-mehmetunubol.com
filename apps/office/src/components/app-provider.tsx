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

/** Polls while the page is visible; pauses when hidden. */
export function usePolling(fn: () => void | Promise<void>, intervalMs: number) {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  });
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const tick = async () => {
      if (stopped) return;
      if (document.visibilityState === "visible") {
        try {
          await ref.current();
        } catch {
          // transient network error; try again next tick
        }
      }
      timer = setTimeout(tick, intervalMs);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        clearTimeout(timer);
        void tick();
      }
    };
    void tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [intervalMs]);
}

export function AppProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const [stored, setStored] = useState<Identity | null | undefined>(undefined);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/state", { cache: "no-store" });
    if (response.status === 401) {
      window.location.href = "/login";
      return;
    }
    if (response.ok) setState((await response.json()) as AppState);
  }, []);

  usePolling(refresh, 5000);

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
