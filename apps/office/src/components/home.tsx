"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MessageCircle, Users } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { Avatar } from "@/components/avatar";
import { PresenceCard } from "@/components/presence-card";
import { sinceLabel, timeLabel, ttlLabel } from "@/lib/format";
import { ADMIN_USERNAME } from "@/lib/constants";

function Today() {
  const today = new Date().toLocaleDateString([], {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return <p className="eyebrow">{today}</p>;
}

export function Home() {
  const { state, chatTitle, personById } = useApp();
  const router = useRouter();
  const [opening, setOpening] = useState<string | null>(null);

  async function openDirect(userId: string) {
    setOpening(userId);
    try {
      const response = await fetch("/api/conversations/direct", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (response.ok) router.push(`/c/${((await response.json()) as { id: string }).id}`);
    } finally {
      setOpening(null);
    }
  }

  const others = state?.people.filter((p) => p.id !== state.me.id) ?? [];
  const inCount = state?.people.filter((p) => p.presence === "in").length ?? 0;
  const admin = state?.people.find((p) => p.username === ADMIN_USERNAME);
  const showAdminBanner = admin && admin.id !== state?.me.id;

  return (
    <main className="safe-top mx-auto w-full max-w-5xl px-4 pb-32 sm:px-6">
      <header className="flex items-end justify-between pt-4 pb-5">
        <div>
          <Today />
          <h1 className="mt-1 text-3xl font-semibold">
            {state ? `Hi, ${state.me.displayName.split(" ")[0]}` : " "}
          </h1>
        </div>
        <p className="text-sm text-[var(--ink-2)] tabular-nums">
          {state ? `${inCount} of ${state.people.length} in` : ""}
        </p>
      </header>

      {showAdminBanner ? (
        <div className="glass rise mb-4 flex items-center gap-3 rounded-full py-2 pr-4 pl-2">
          <Avatar name={admin.displayName} presence={admin.presence} size={34} />
          <p className="min-w-0 flex-1 truncate text-sm">
            <span className="font-semibold">{admin.displayName}</span>{" "}
            <span className="text-[var(--ink-2)]">
              is {admin.presence === "in" ? "in the office" : "out"}
              {admin.presenceUpdatedAt ? ` · ${sinceLabel(admin.presenceUpdatedAt)}` : ""}
            </span>
          </p>
        </div>
      ) : null}

      {/* Phone: status, messages, people. Desktop: status + people left, messages right. */}
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:items-start">
        <div className="md:col-start-1 md:row-start-1">
          <PresenceCard />
        </div>

        <section
          className="glass rise rounded-[1.75rem] p-2 md:col-start-1 md:row-start-2"
          style={{ animationDelay: "60ms" }}
        >
          <h2 className="eyebrow px-3 pt-3 pb-2">People</h2>
          {state && others.length === 0 ? (
            <p className="px-3 pb-3 text-sm text-[var(--ink-2)]">No one else yet.</p>
          ) : null}
          <ul>
            {others.map((person) => (
              <li key={person.id}>
                <button
                  type="button"
                  onClick={() => openDirect(person.id)}
                  disabled={opening !== null}
                  className="row flex w-full items-center gap-3 px-3 py-2.5 text-left"
                >
                  <Avatar name={person.displayName} presence={person.presence} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{person.displayName}</span>
                    <span className="block truncate text-[13px] text-[var(--ink-2)]">
                      {person.presence === "in" ? "In" : "Out"}
                      {person.presenceUpdatedAt ? ` · ${sinceLabel(person.presenceUpdatedAt)}` : ""}
                    </span>
                  </span>
                  <MessageCircle
                    size={18}
                    className={opening === person.id ? "animate-pulse" : "text-[var(--ink-3)]"}
                  />
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section
          className="glass rise row-start-2 self-start rounded-[1.75rem] p-2 md:col-start-2 md:row-span-2 md:row-start-1"
          style={{ animationDelay: "120ms" }}
        >
          <div className="flex items-baseline justify-between px-3 pt-3 pb-2">
            <h2 className="eyebrow">Messages</h2>
            {state ? (
              <span className="text-xs text-[var(--ink-3)]">
                Disappear after {ttlLabel(state.ttlHours)}
              </span>
            ) : null}
          </div>
          {state && state.chats.length === 0 ? (
            <p className="px-3 pb-4 text-sm text-[var(--ink-2)]">
              No conversations yet. Tap someone under People to start one.
            </p>
          ) : null}
          <ul>
            {state?.chats.map((chat) => {
              const other =
                chat.kind === "direct"
                  ? personById(chat.memberIds.find((id) => id !== state.me.id) ?? "")
                  : undefined;
              const title = chatTitle(chat);
              return (
                <li key={chat.id}>
                  <Link href={`/c/${chat.id}`} className="row flex items-center gap-3 px-3 py-2.5">
                    {chat.kind === "group" ? (
                      <span className="avatar" style={{ width: 44, height: 44 }}>
                        <Users size={18} />
                      </span>
                    ) : (
                      <Avatar name={title} presence={other?.presence} />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{title}</span>
                      <span className="block truncate text-[13px] text-[var(--ink-2)]">
                        {chat.kind === "group" ? `${chat.memberIds.length} members` : "Private"}
                        {chat.lastMessageAt ? ` · ${timeLabel(chat.lastMessageAt)}` : ""}
                      </span>
                    </span>
                    {chat.unread > 0 ? (
                      <span className="min-w-6 rounded-full bg-[var(--mine)] px-2 py-0.5 text-center text-xs font-semibold text-[var(--mine-ink)] tabular-nums">
                        {chat.unread}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </main>
  );
}
