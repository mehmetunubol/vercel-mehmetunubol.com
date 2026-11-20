"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, ChevronLeft, LockKeyhole, Users } from "lucide-react";
import { cn } from "@repo/ui";
import { useApp, usePolling } from "@/components/app-provider";
import { Avatar } from "@/components/avatar";
import { UnlockCard } from "@/components/unlock-card";
import { decryptMessage, encryptMessage, messageAad } from "@/lib/crypto";
import { timeLabel, ttlLabel } from "@/lib/format";
import { MAX_MESSAGE_CHARS } from "@/lib/constants";
import type { Presence } from "@/lib/types";

interface Member {
  id: string;
  displayName: string;
  publicKey: string | null;
  presence: Presence;
}

interface Conversation {
  id: string;
  kind: "direct" | "group";
  name: string | null;
  members: Member[];
}

interface WireMessage {
  id: string;
  senderId: string;
  senderPublicKey: string;
  ciphertext: string;
  iv: string;
  wrappedKey: string | null;
  createdAt: string;
  expiresAt: string;
}

type Body =
  { kind: "text"; text: string } | { kind: "no-key" } | { kind: "failed" } | { kind: "pending" };

interface Item {
  id: string;
  senderId: string;
  createdAt: string;
  expiresAt: string;
  body: Body;
  sending?: boolean;
  error?: boolean;
}

export function ChatView({ conversationId }: { conversationId: string }) {
  const { state, identity, identityStatus, refresh } = useApp();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [missing, setMissing] = useState(false);
  const [items, setItems] = useState<Map<string, Item>>(new Map());
  const [draft, setDraft] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const wire = useRef<Map<string, WireMessage>>(new Map());
  const cursor = useRef<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const meId = state?.me.id;

  const loadConversation = useCallback(async () => {
    const response = await fetch(`/api/conversations/${conversationId}`, { cache: "no-store" });
    if (response.status === 404) setMissing(true);
    else if (response.ok) setConversation((await response.json()) as Conversation);
  }, [conversationId]);

  usePolling(loadConversation, 30_000);

  const decryptInto = useCallback(
    async (messages: WireMessage[]) => {
      if (!identity) return;
      const decoded = await Promise.all(
        messages.map(async (m): Promise<Item> => {
          let body: Body;
          if (!m.wrappedKey) body = { kind: "no-key" };
          else {
            try {
              const text = await decryptMessage(
                {
                  ciphertext: m.ciphertext,
                  iv: m.iv,
                  wrappedKey: m.wrappedKey,
                  senderPublicKey: m.senderPublicKey,
                },
                identity.privateKey,
                messageAad(conversationId, m.senderId, m.id),
              );
              body = { kind: "text", text };
            } catch {
              body = { kind: "failed" };
            }
          }
          return {
            id: m.id,
            senderId: m.senderId,
            createdAt: m.createdAt,
            expiresAt: m.expiresAt,
            body,
          };
        }),
      );
      setItems((prev) => {
        const next = new Map(prev);
        for (const item of decoded) next.set(item.id, item);
        return next;
      });
    },
    [identity, conversationId],
  );

  const loadMessages = useCallback(async () => {
    const query = cursor.current ? `?after=${encodeURIComponent(cursor.current)}` : "";
    const response = await fetch(`/api/conversations/${conversationId}/messages${query}`, {
      cache: "no-store",
    });
    if (response.status === 404) return setMissing(true);
    if (!response.ok) return;
    const { messages } = (await response.json()) as { messages: WireMessage[] };
    const fresh = messages.filter((m) => !wire.current.has(m.id));
    for (const m of messages) wire.current.set(m.id, m);
    if (messages.length) cursor.current = messages[messages.length - 1]!.createdAt;
    if (fresh.length) {
      await decryptInto(fresh);
      if (fresh.some((m) => m.senderId !== meId)) {
        await fetch(`/api/conversations/${conversationId}/read`, { method: "POST" });
        void refresh();
      }
    }
  }, [conversationId, decryptInto, meId, refresh]);

  usePolling(loadMessages, 2500);

  // Once the key unlocks, decrypt anything already fetched.
  useEffect(() => {
    if (identity) void decryptInto([...wire.current.values()]);
  }, [identity, decryptInto]);

  // Drop messages as they expire, even with no network activity.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const list = useMemo(
    () =>
      [...items.values()]
        .filter((m) => new Date(m.expiresAt).getTime() > now)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [items, now],
  );

  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [list.length, identityStatus]);

  const members = useMemo(() => conversation?.members ?? [], [conversation]);
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const other = conversation?.kind === "direct" ? members.find((m) => m.id !== meId) : undefined;
  const title = conversation
    ? conversation.kind === "group"
      ? (conversation.name ?? "Group")
      : (other?.displayName ?? "Private chat")
    : "";
  const withoutKeys = members.filter((m) => !m.publicKey && m.id !== meId);

  async function send() {
    const text = draft.trim();
    if (!text || !identity || !meId || !conversation) return;
    const id = crypto.randomUUID();
    const nowIso = new Date().toISOString();
    const optimistic: Item = {
      id,
      senderId: meId,
      createdAt: nowIso,
      expiresAt: new Date(Date.now() + (state?.ttlHours ?? 24) * 3_600_000).toISOString(),
      body: { kind: "text", text },
      sending: true,
    };
    setItems((prev) => new Map(prev).set(id, optimistic));
    setDraft("");
    stickToBottom.current = true;

    try {
      const recipients = Object.fromEntries(
        conversation.members.filter((m) => m.publicKey).map((m) => [m.id, m.publicKey!]),
      );
      recipients[meId] = identity.publicKey;
      const encrypted = await encryptMessage(
        text,
        identity,
        recipients,
        messageAad(conversation.id, meId, id),
      );
      const response = await fetch(`/api/conversations/${conversation.id}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, senderPublicKey: identity.publicKey, ...encrypted }),
      });
      if (!response.ok) throw new Error();
      const saved = (await response.json()) as { createdAt: string; expiresAt: string };
      setItems((prev) => new Map(prev).set(id, { ...optimistic, ...saved, sending: false }));
    } catch {
      setItems((prev) => new Map(prev).set(id, { ...optimistic, sending: false, error: true }));
    }
  }

  if (missing) {
    return (
      <main className="grid min-h-dvh place-items-center px-6 text-center">
        <div>
          <p className="font-semibold">This conversation isn&rsquo;t available.</p>
          <Link href="/" className="btn btn-quiet mt-4">
            Back
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-dvh flex-col">
      <header className="safe-top relative z-20 px-3">
        <div className="glass-strong mx-auto flex max-w-3xl items-center gap-3 rounded-full py-1.5 pr-4 pl-1.5">
          <Link
            href="/"
            aria-label="Back"
            className="grid size-10 place-items-center rounded-full hover:bg-[var(--hairline)]"
          >
            <ChevronLeft size={22} />
          </Link>
          {conversation?.kind === "group" ? (
            <span className="avatar" style={{ width: 36, height: 36 }}>
              <Users size={16} />
            </span>
          ) : other ? (
            <Avatar name={other.displayName} presence={other.presence} size={36} />
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="truncate leading-tight font-semibold">{title || " "}</p>
            <p className="truncate text-xs text-[var(--ink-2)]">
              {conversation?.kind === "group"
                ? members.map((m) => m.displayName.split(" ")[0]).join(", ")
                : other
                  ? other.presence === "in"
                    ? "In the office"
                    : "Out of the office"
                  : ""}
            </p>
          </div>
        </div>
      </header>

      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="scroll-thin flex-1 overflow-y-auto px-3 pt-4 pb-4"
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-1">
          <p className="mx-auto mb-4 flex items-center gap-1.5 rounded-full px-3 py-1 text-center text-xs text-[var(--ink-3)]">
            <LockKeyhole size={12} /> End-to-end encrypted · disappears after{" "}
            {ttlLabel(state?.ttlHours ?? 24)}
          </p>

          {identityStatus === "locked" ? <UnlockCard /> : null}

          {identityStatus === "ready" &&
            list.map((item, index) => {
              const mine = item.senderId === meId;
              const prev = list[index - 1];
              const next = list[index + 1];
              const firstOfRun = !prev || prev.senderId !== item.senderId;
              const lastOfRun = !next || next.senderId !== item.senderId;
              const sender = memberById.get(item.senderId);
              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex flex-col",
                    mine ? "items-end" : "items-start",
                    firstOfRun && index > 0 && "mt-2",
                  )}
                >
                  {conversation?.kind === "group" && !mine && firstOfRun ? (
                    <span className="mb-0.5 px-3 text-xs text-[var(--ink-2)]">
                      {sender?.displayName ?? "Former member"}
                    </span>
                  ) : null}
                  <div
                    className={cn(
                      "max-w-[82%] rounded-[1.25rem] px-3.5 py-2 text-[15px] leading-snug break-words whitespace-pre-wrap",
                      mine ? "bg-[var(--mine)] text-[var(--mine-ink)]" : "glass",
                      mine && lastOfRun && "rounded-br-md",
                      !mine && lastOfRun && "rounded-bl-md",
                      item.sending && "opacity-60",
                    )}
                  >
                    {item.body.kind === "text" ? (
                      item.body.text
                    ) : (
                      <span className="text-[var(--ink-2)] italic">
                        {item.body.kind === "no-key"
                          ? "Sent before you joined, or before your key was set up."
                          : "Can't decrypt this message (the key changed)."}
                      </span>
                    )}
                  </div>
                  {lastOfRun ? (
                    <span
                      className={cn(
                        "mt-0.5 px-2 text-[11px] text-[var(--ink-3)] tabular-nums",
                        item.error && "text-[var(--danger)]",
                      )}
                    >
                      {item.error
                        ? "Not sent"
                        : item.sending
                          ? "Sending…"
                          : timeLabel(item.createdAt)}
                    </span>
                  ) : null}
                </div>
              );
            })}
        </div>
      </div>

      <footer className="safe-bottom relative z-20 px-3 pt-1">
        {withoutKeys.length > 0 && identityStatus === "ready" ? (
          <p className="mx-auto mb-2 max-w-3xl px-2 text-xs text-[var(--ink-2)]">
            {withoutKeys.map((m) => m.displayName).join(", ")}{" "}
            {withoutKeys.length === 1 ? "hasn't" : "haven't"} signed in yet and won&rsquo;t be able
            to read new messages.
          </p>
        ) : null}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          className="glass-strong mx-auto flex max-w-3xl items-end gap-2 rounded-[1.6rem] p-1.5 pl-4"
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_MESSAGE_CHARS))}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing &&
                window.matchMedia("(hover: hover)").matches
              ) {
                e.preventDefault();
                void send();
              }
            }}
            rows={1}
            placeholder={identityStatus === "ready" ? "Message" : "Unlock to send messages"}
            disabled={identityStatus !== "ready"}
            aria-label="Message"
            className="field-sizing-content max-h-40 min-h-10 flex-1 resize-none bg-transparent py-2 text-base outline-none placeholder:text-[var(--ink-3)]"
          />
          <button
            type="submit"
            aria-label="Send"
            disabled={!draft.trim() || identityStatus !== "ready"}
            className="btn btn-primary size-10 shrink-0 p-0"
          >
            <ArrowUp size={20} strokeWidth={2.4} />
          </button>
        </form>
      </footer>
    </main>
  );
}
