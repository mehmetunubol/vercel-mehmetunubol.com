"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { CalendarDays, Megaphone, MessageCircle, ShieldAlert, Users } from "lucide-react";
import { useEvents } from "@/components/use-events";
import { dayHeading, endOf, timeRange } from "@/lib/event-time";
import { useApp, useNow } from "@/components/app-provider";
import { Avatar } from "@/components/avatar";
import { PresenceCard } from "@/components/presence-card";
import { sinceLabel, timeLabel, ttlLabel } from "@/lib/format";
import { personPlanLabel, withDuePlan } from "@/lib/plan";
import type { Person } from "@/lib/types";
import { ADMIN_USERNAME } from "@/lib/constants";

const noSubscribe = () => () => {};

/** Today's date in the viewer's timezone; rendered only in the browser to avoid a hydration mismatch. */
function Today() {
  const today = useSyncExternalStore(
    noSubscribe,
    () => new Date().toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" }),
    () => "",
  );
  return <p className="eyebrow">{today || "\u00a0"}</p>;
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

  const people = (state?.people ?? []).map((p) => withDuePlan(p));
  const inPeople = people.filter((p) => p.presence === "in");
  const outPeople = people.filter((p) => p.presence === "out");
  const inCount = inPeople.length;
  const admin = people.find((p) => p.username === ADMIN_USERNAME);
  const adminPlan = admin ? personPlanLabel(admin) : null;
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

      {state?.admin && (state.admin.securityAlerts > 0 || state.admin.loginsDisabled) ? (
        <Link
          href="/admin"
          className="rise mb-4 flex items-center gap-3 rounded-[1.6rem] border border-[color-mix(in_oklab,var(--danger)_35%,transparent)] bg-[color-mix(in_oklab,var(--danger)_10%,transparent)] px-4 py-3 text-sm"
        >
          <ShieldAlert size={18} className="shrink-0 text-[var(--danger)]" />
          <span className="min-w-0 flex-1">
            {state.admin.securityAlerts > 0 ? (
              <span className="block font-semibold">
                {state.admin.securityAlerts === 1
                  ? "An account was locked after failed sign-in attempts"
                  : `${state.admin.securityAlerts} accounts were locked after failed sign-in attempts`}
              </span>
            ) : null}
            {state.admin.loginsDisabled ? (
              <span className="block text-[var(--ink-2)]">
                Sign-ins are disabled for everyone but you.
              </span>
            ) : null}
          </span>
          <span className="shrink-0 font-semibold">Review</span>
        </Link>
      ) : null}

      {showAdminBanner ? (
        <div className="glass rise mb-4 flex items-center gap-3 rounded-[1.6rem] py-2 pr-4 pl-2">
          <Avatar name={admin.displayName} presence={admin.presence} size={34} />
          <p className="line-clamp-2 min-w-0 flex-1 text-sm leading-snug">
            <span className="font-semibold">{admin.displayName}</span>{" "}
            <span className="text-[var(--ink-2)]">
              is {admin.presence === "in" ? "in the office" : "out"}
              {adminPlan
                ? ` · ${adminPlan.charAt(0).toLowerCase()}${adminPlan.slice(1)}`
                : admin.presenceUpdatedAt
                  ? ` · ${sinceLabel(admin.presenceUpdatedAt)}`
                  : ""}
            </span>
          </p>
        </div>
      ) : null}

      {/* Phone: status, messages, people. Desktop: status + people left, messages right. */}
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:items-start">
        <div className="space-y-4 md:col-start-1 md:row-start-1">
          <PresenceCard />
          <UpNext meId={state?.me.id} />
        </div>

        <section
          className="glass rise rounded-[1.75rem] p-2 md:col-start-1 md:row-start-2"
          style={{ animationDelay: "60ms" }}
        >
          <PeopleGroup
            title="In the office"
            tone="in"
            people={inPeople}
            meId={state?.me.id}
            opening={opening}
            onOpen={openDirect}
            empty={state ? "Nobody's in right now." : ""}
          />
          <div className="mx-3 my-1 h-px bg-[var(--hairline)]" />
          <PeopleGroup
            title="Out"
            tone="out"
            people={outPeople}
            meId={state?.me.id}
            opening={opening}
            onOpen={openDirect}
            empty={state ? "Everyone's in." : ""}
          />
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
                        {chat.announcement ? <Megaphone size={18} /> : <Users size={18} />}
                      </span>
                    ) : (
                      <Avatar name={title} presence={other?.presence} />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{title}</span>
                      <span className="block truncate text-[13px] text-[var(--ink-2)]">
                        {chat.kind === "group"
                          ? chat.announcement
                            ? "Announcements"
                            : `${chat.memberIds.length} members`
                          : "Private"}
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

function PeopleGroup({
  title,
  tone,
  people,
  meId,
  opening,
  onOpen,
  empty,
}: {
  title: string;
  tone: "in" | "out";
  people: Person[];
  meId: string | undefined;
  opening: string | null;
  onOpen: (userId: string) => void;
  empty: string;
}) {
  // You first, then by name.
  const sorted = [...people].sort((a, b) =>
    a.id === meId ? -1 : b.id === meId ? 1 : a.displayName.localeCompare(b.displayName),
  );
  return (
    <div>
      <h2 className="eyebrow flex items-center gap-2 px-3 pt-3 pb-2">
        <span className={`dot dot-${tone}`} style={{ width: 6, height: 6 }} />
        {title}
        <span className="tabular-nums">· {people.length}</span>
      </h2>
      {people.length === 0 && empty ? (
        <p className="px-3 pb-3 text-sm text-[var(--ink-2)]">{empty}</p>
      ) : null}
      <ul>
        {sorted.map((person) => {
          const isMe = person.id === meId;
          const detail =
            personPlanLabel(person) ??
            (person.presenceUpdatedAt
              ? `Since ${timeLabel(person.presenceUpdatedAt)}`
              : "Not set yet");
          const content = (
            <>
              <Avatar name={person.displayName} presence={person.presence} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">
                  {person.displayName}
                  {isMe ? <span className="font-normal text-[var(--ink-3)]"> · You</span> : null}
                </span>
                <span className="block truncate text-[13px] text-[var(--ink-2)]">{detail}</span>
              </span>
            </>
          );
          return (
            <li key={person.id}>
              {isMe ? (
                <div className="flex items-center gap-3 px-3 py-2.5">{content}</div>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpen(person.id)}
                  disabled={opening !== null}
                  className="row flex w-full items-center gap-3 px-3 py-2.5 text-left"
                >
                  {content}
                  <MessageCircle
                    size={18}
                    className={opening === person.id ? "animate-pulse" : "text-[var(--ink-3)]"}
                  />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** The next few events you're invited to (and haven't declined). */
function UpNext({ meId }: { meId: string | undefined }) {
  const { events } = useEvents(30_000);
  const now = useNow();
  const upcoming = (events ?? [])
    .filter(
      (e) =>
        endOf(new Date(e.startsAt), e.durationMinutes).getTime() >= now &&
        e.invites.find((i) => i.userId === meId)?.response !== "declined",
    )
    .slice(0, 3);
  if (!upcoming.length) return null;
  return (
    <section className="glass rise rounded-[1.75rem] p-2" style={{ animationDelay: "40ms" }}>
      <div className="flex items-baseline justify-between px-3 pt-3 pb-2">
        <h2 className="eyebrow">Up next</h2>
        <Link
          href="/events"
          className="text-xs font-semibold text-[var(--ink-2)] hover:text-[var(--ink)]"
        >
          All events
        </Link>
      </div>
      <ul>
        {upcoming.map((e) => {
          const start = new Date(e.startsAt);
          const pending = e.invites.find((i) => i.userId === meId)?.response === "pending";
          return (
            <li key={e.id}>
              <Link href="/events" className="row flex items-center gap-3 px-3 py-2.5">
                <span className="avatar" style={{ width: 44, height: 44 }}>
                  <CalendarDays size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{e.title}</span>
                  <span className="block truncate text-[13px] text-[var(--ink-2)] tabular-nums">
                    {dayHeading(start)} · {timeRange(start, e.durationMinutes)}
                  </span>
                </span>
                {pending ? (
                  <span className="rounded-full bg-[color-mix(in_oklab,var(--danger)_14%,transparent)] px-2 py-0.5 text-xs font-semibold text-[var(--danger)]">
                    Reply
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
