import { asc, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ChevronDown, Megaphone, ShieldAlert } from "lucide-react";
import { db } from "@/lib/db";
import { conversationMembers, conversations, securityAlerts, users } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/session";
import { applyDuePlans } from "@/lib/presence";
import { getLoginsDisabled, getMessageTtlHours } from "@/lib/settings";
import { EmergencyPanel } from "@/components/emergency-panel";
import { LocalTime } from "@/components/local-time";
import { ADMIN_USERNAME, MAX_MESSAGE_TTL_HOURS, MIN_MESSAGE_TTL_HOURS } from "@/lib/constants";
import { ActionForm } from "@/components/action-form";
import { Avatar } from "@/components/avatar";
import {
  createGroup,
  createUser,
  deleteGroup,
  deleteUser,
  markAlertsSeen,
  unlockUser,
  renameUser,
  resetPassword,
  saveSettings,
  updateGroup,
} from "./actions";

export const dynamic = "force-dynamic";

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass rise rounded-[1.75rem] p-2">
      <div className="px-3 pt-3 pb-2">
        <h2 className="eyebrow">{title}</h2>
        {hint ? <p className="mt-1 text-sm text-[var(--ink-2)]">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Disclosure({
  summary,
  children,
}: {
  summary: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <details className="group rounded-2xl open:bg-[var(--glass)]">
      <summary className="row flex cursor-pointer list-none items-center gap-3 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
        {summary}
        <ChevronDown
          size={18}
          className="text-[var(--ink-3)] transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="space-y-4 px-3 pt-1 pb-4">{children}</div>
    </details>
  );
}

function AnnouncementToggle({ defaultChecked }: { defaultChecked?: boolean }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--hairline)] bg-[var(--field)] p-3">
      <input
        type="checkbox"
        name="announcement"
        defaultChecked={defaultChecked}
        className="mt-0.5 size-4 accent-[var(--ink)]"
      />
      <span>
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <Megaphone size={14} /> Announcements only
        </span>
        <span className="block text-xs text-[var(--ink-2)]">
          Only you can post. Members can read and react.
        </span>
      </span>
    </label>
  );
}

function MemberPicker({
  people,
  selected,
}: {
  people: { id: string; displayName: string; username: string }[];
  selected?: Set<string>;
}) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="eyebrow mb-1.5">Members</legend>
      <div className="flex flex-wrap gap-2">
        {people.map((p) => (
          <label
            key={p.id}
            className="flex cursor-pointer items-center gap-2 rounded-full border border-[var(--hairline)] bg-[var(--field)] px-3 py-1.5 text-sm has-checked:border-transparent has-checked:bg-[var(--mine)] has-checked:text-[var(--mine-ink)]"
          >
            <input
              type="checkbox"
              name="memberIds"
              value={p.id}
              defaultChecked={selected?.has(p.id)}
              className="sr-only"
            />
            {p.displayName}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default async function AdminPage() {
  const me = await getCurrentUser();
  if (!me?.isAdmin) redirect("/");
  await applyDuePlans();

  const [people, groups, members, ttlHours, alerts, loginsDisabled] = await Promise.all([
    db.select().from(users).orderBy(asc(users.displayName)),
    db
      .select()
      .from(conversations)
      .where(eq(conversations.kind, "group"))
      .orderBy(asc(conversations.name)),
    db
      .select({
        conversationId: conversationMembers.conversationId,
        userId: conversationMembers.userId,
      })
      .from(conversationMembers)
      .innerJoin(conversations, eq(conversations.id, conversationMembers.conversationId))
      .where(eq(conversations.kind, "group")),
    getMessageTtlHours(),
    db
      .select({
        id: securityAlerts.id,
        kind: securityAlerts.kind,
        userId: securityAlerts.userId,
        createdAt: securityAlerts.createdAt,
        seenAt: securityAlerts.seenAt,
      })
      .from(securityAlerts)
      .orderBy(desc(securityAlerts.createdAt))
      .limit(20),
    getLoginsDisabled(),
  ]);
  const unseen = alerts.filter((a) => !a.seenAt).length;
  const now = new Date();
  const membersOf = (groupId: string) =>
    new Set(members.filter((m) => m.conversationId === groupId).map((m) => m.userId));
  const nameOf = new Map(people.map((p) => [p.id, p.displayName]));

  return (
    <main className="safe-top mx-auto w-full max-w-3xl space-y-4 px-4 pb-32 sm:px-6">
      <header className="pt-4 pb-1">
        <p className="eyebrow">Administration</p>
        <h1 className="mt-1 text-3xl font-semibold">People &amp; groups</h1>
      </header>

      <Section
        title="Security"
        hint="An alert appears when an account is locked after 5 wrong passwords in a row."
      >
        <div className="px-1 pb-2">
          {alerts.length === 0 ? (
            <p className="px-2 pb-2 text-sm text-[var(--ink-2)]">No alerts in the last 30 days.</p>
          ) : null}
          <ul className="space-y-1">
            {alerts.map((alert) => {
              const person = people.find((p) => p.id === alert.userId);
              const stillLocked = person?.lockedUntil && person.lockedUntil > now;
              return (
                <li
                  key={alert.id}
                  className={`flex items-start gap-3 rounded-2xl px-2 py-2.5 ${alert.seenAt ? "" : "bg-[color-mix(in_oklab,var(--danger)_9%,transparent)]"}`}
                >
                  <ShieldAlert
                    size={18}
                    className={`mt-0.5 shrink-0 ${alert.seenAt ? "text-[var(--ink-3)]" : "text-[var(--danger)]"}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-semibold">{person?.displayName ?? "Removed user"}</span>
                      {person ? (
                        <span className="text-[var(--ink-2)]"> (@{person.username})</span>
                      ) : null}
                      : locked after 5 failed sign-in attempts
                    </p>
                    <p className="text-xs text-[var(--ink-3)] tabular-nums">
                      <LocalTime iso={alert.createdAt.toISOString()} />
                      {stillLocked ? " · still locked" : ""}
                    </p>
                  </div>
                  {stillLocked && person ? (
                    <ActionForm
                      action={unlockUser}
                      submitLabel="Unlock now"
                      submitClassName="btn-quiet btn-sm"
                    >
                      <input type="hidden" name="userId" value={person.id} />
                    </ActionForm>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {unseen > 0 ? (
            <div className="px-2 pt-2">
              <ActionForm
                action={markAlertsSeen}
                submitLabel={`Mark ${unseen} as seen`}
                submitClassName="btn-quiet btn-sm"
              />
            </div>
          ) : null}
        </div>
      </Section>

      <Section
        title="Emergency"
        hint="Use these only if something has gone wrong. Each asks for confirmation."
      >
        <EmergencyPanel loginsDisabled={loginsDisabled} />
      </Section>

      <Section title="People" hint="Only people listed here can sign in.">
        <div>
          {people.map((person) => {
            const isOwner = person.username === ADMIN_USERNAME;
            return (
              <Disclosure
                key={person.id}
                summary={
                  <>
                    <Avatar name={person.displayName} presence={person.presence} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{person.displayName}</span>
                      <span className="block truncate text-[13px] text-[var(--ink-2)]">
                        @{person.username}
                        {isOwner ? " · admin" : ""}
                        {!person.publicKey ? " · hasn't signed in" : ""}
                        {person.lockedUntil && person.lockedUntil > new Date()
                          ? " · locked out"
                          : ""}
                      </span>
                    </span>
                  </>
                }
              >
                <ActionForm action={renameUser} submitLabel="Save name" className="space-y-2">
                  <input type="hidden" name="userId" value={person.id} />
                  <input
                    name="displayName"
                    defaultValue={person.displayName}
                    className="field"
                    aria-label="Display name"
                  />
                </ActionForm>
                <ActionForm
                  action={resetPassword}
                  submitLabel="Reset password"
                  submitClassName="btn-quiet btn-sm"
                  resetOnSuccess
                  confirm={`Reset ${person.displayName}'s password? They'll be signed out and won't be able to read earlier messages.`}
                  className="space-y-2"
                >
                  <input type="hidden" name="userId" value={person.id} />
                  <input
                    name="password"
                    type="text"
                    autoComplete="off"
                    placeholder="New password"
                    className="field"
                    aria-label="New password"
                  />
                </ActionForm>
                {!isOwner ? (
                  <ActionForm
                    action={deleteUser}
                    submitLabel="Remove person"
                    submitClassName="btn-danger btn-sm"
                    confirm={`Remove ${person.displayName}? Their private chats are deleted too.`}
                  >
                    <input type="hidden" name="userId" value={person.id} />
                  </ActionForm>
                ) : null}
              </Disclosure>
            );
          })}
        </div>
        <div className="mx-1 mt-2 rounded-2xl bg-[var(--glass)] p-3">
          <p className="mb-3 font-medium">Add a person</p>
          <ActionForm action={createUser} submitLabel="Add" resetOnSuccess className="space-y-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                name="displayName"
                placeholder="Display name"
                required
                className="field"
                aria-label="Display name"
              />
              <input
                name="username"
                placeholder="username"
                required
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="field"
                aria-label="Username"
              />
            </div>
            <input
              name="password"
              type="text"
              autoComplete="off"
              placeholder="Initial password (min 8)"
              required
              className="field"
              aria-label="Password"
            />
          </ActionForm>
        </div>
      </Section>

      <Section title="Groups" hint="Only you can create groups and change who's in them.">
        <div>
          {groups.length === 0 ? (
            <p className="px-3 pb-2 text-sm text-[var(--ink-2)]">No groups yet.</p>
          ) : null}
          {groups.map((group) => {
            const selected = membersOf(group.id);
            return (
              <Disclosure
                key={group.id}
                summary={
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 truncate font-medium">
                      {group.announcement ? <Megaphone size={14} className="shrink-0" /> : null}
                      {group.name}
                    </span>
                    <span className="block truncate text-[13px] text-[var(--ink-2)]">
                      {[...selected]
                        .map((id) => nameOf.get(id))
                        .filter(Boolean)
                        .join(", ") || "No members"}
                    </span>
                  </span>
                }
              >
                <ActionForm action={updateGroup} submitLabel="Save group" className="space-y-3">
                  <input type="hidden" name="groupId" value={group.id} />
                  <input
                    name="name"
                    defaultValue={group.name ?? ""}
                    className="field"
                    aria-label="Group name"
                  />
                  <MemberPicker people={people} selected={selected} />
                  <AnnouncementToggle defaultChecked={group.announcement} />
                </ActionForm>
                <ActionForm
                  action={deleteGroup}
                  submitLabel="Delete group"
                  submitClassName="btn-danger btn-sm"
                  confirm={`Delete ${group.name} and all its messages?`}
                >
                  <input type="hidden" name="groupId" value={group.id} />
                </ActionForm>
              </Disclosure>
            );
          })}
        </div>
        <div className="mx-1 mt-2 rounded-2xl bg-[var(--glass)] p-3">
          <p className="mb-3 font-medium">New group</p>
          <ActionForm
            action={createGroup}
            submitLabel="Create group"
            resetOnSuccess
            className="space-y-3"
          >
            <input
              name="name"
              placeholder="Group name"
              required
              className="field"
              aria-label="Group name"
            />
            <MemberPicker people={people} selected={new Set([me.id])} />
            <AnnouncementToggle />
          </ActionForm>
        </div>
      </Section>

      <Section
        title="Messages"
        hint="Messages are deleted from the server this many hours after they're sent."
      >
        <div className="px-3 pb-3">
          <ActionForm
            action={saveSettings}
            submitLabel="Save"
            className="flex flex-wrap items-center gap-3"
          >
            <label className="flex items-center gap-2">
              <input
                name="ttlHours"
                type="number"
                min={MIN_MESSAGE_TTL_HOURS}
                max={MAX_MESSAGE_TTL_HOURS}
                defaultValue={ttlHours}
                className="field w-28 tabular-nums"
                aria-label="Hours"
              />
              <span className="text-sm text-[var(--ink-2)]">hours</span>
            </label>
          </ActionForm>
        </div>
      </Section>
    </main>
  );
}
