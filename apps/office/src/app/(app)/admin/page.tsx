import { asc, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ChevronDown, History, Megaphone, ShieldAlert } from "lucide-react";
import { db } from "@/lib/db";
import {
  adminLog,
  conversationMembers,
  conversations,
  securityAlerts,
  users,
} from "@/lib/db/schema";
import { deleteOldAdminLog } from "@/lib/admin-log";
import { IP_FAILURE_LIMIT, IP_WINDOW_MINUTES } from "@/lib/guessing";
import { FREE_PLAN_STORAGE_BYTES, formatBytes, getHealth } from "@/lib/health";
import { getCurrentUser } from "@/lib/session";
import { serverT } from "@/lib/i18n-server";
import type { Vars } from "@/lib/i18n";
import { applyDuePlans } from "@/lib/presence";
import { getLoginsDisabled, getMessageTtlHours, getPhotosAllowed } from "@/lib/settings";
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
  unblockAddress,
  unlockUser,
  renameUser,
  resetPassword,
  savePhotoSettings,
  saveSettings,
  updateGroup,
} from "./actions";

export const dynamic = "force-dynamic";

type T = (text: string, vars?: Vars) => string;

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

function AnnouncementToggle({ defaultChecked, t }: { defaultChecked?: boolean; t: T }) {
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
          <Megaphone size={14} /> {t("Announcements only")}
        </span>
        <span className="block text-xs text-[var(--ink-2)]">
          {t("Only you can post. Members can read and react.")}
        </span>
      </span>
    </label>
  );
}

function MemberPicker({
  people,
  selected,
  t,
}: {
  people: { id: string; displayName: string; username: string }[];
  selected?: Set<string>;
  t: T;
}) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="eyebrow mb-1.5">{t("Members")}</legend>
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
  const t = await serverT(me.locale);
  await applyDuePlans();

  await deleteOldAdminLog();
  const [people, groups, members, ttlHours, alerts, loginsDisabled, activity, photosAllowed] =
    await Promise.all([
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
          detail: securityAlerts.detail,
          userId: securityAlerts.userId,
          createdAt: securityAlerts.createdAt,
          seenAt: securityAlerts.seenAt,
        })
        .from(securityAlerts)
        .orderBy(desc(securityAlerts.createdAt))
        .limit(20),
      getLoginsDisabled(),
      db.select().from(adminLog).orderBy(desc(adminLog.createdAt)).limit(50),
      getPhotosAllowed(),
    ]);
  const health = await getHealth();
  const storageShare = Math.min(1, health.databaseBytes / FREE_PLAN_STORAGE_BYTES);
  const unseen = alerts.filter((a) => !a.seenAt).length;
  const now = new Date();
  const membersOf = (groupId: string) =>
    new Set(members.filter((m) => m.conversationId === groupId).map((m) => m.userId));
  const nameOf = new Map(people.map((p) => [p.id, p.displayName]));

  return (
    <main className="safe-top mx-auto w-full max-w-3xl space-y-4 px-4 pb-32 sm:px-6">
      <header className="pt-4 pb-1">
        <p className="eyebrow">{t("Administration")}</p>
        <h1 className="mt-1 text-3xl font-semibold">{t("People & groups")}</h1>
      </header>

      <Section
        title={t("Health")}
        hint={t("Usage at a glance. Counts only; nothing here reads message content.")}
      >
        <div className="space-y-4 px-3 pb-3">
          <div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">{t("Database storage")}</span>
              <span className="text-[var(--ink-2)] tabular-nums">
                {t("{used} of {total} (free plan)", {
                  used: formatBytes(health.databaseBytes),
                  total: formatBytes(FREE_PLAN_STORAGE_BYTES),
                })}
              </span>
            </div>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--field)]"
              role="meter"
              aria-label={t("Database storage used")}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(storageShare * 100)}
            >
              <div
                className={`h-full rounded-full ${storageShare > 0.8 ? "bg-[var(--danger)]" : "bg-[var(--ink-2)]"}`}
                style={{ width: `${Math.max(2, storageShare * 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-[var(--ink-3)]">
              {t("Largest:")}{" "}
              {health.largestTables
                .map((table) => `${table.name} ${formatBytes(table.bytes)}`)
                .join(" · ")}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              [
                t("Photos & clips stored"),
                `${health.photoCount} · ${formatBytes(health.photoBytes)}`,
              ],
              [t("Messages"), String(health.messages)],
              [t("Upcoming events"), String(health.upcomingEvents)],
              [t("People"), String(health.people)],
              [t("Active in last 24 h"), String(health.activeToday)],
              [t("Online now"), String(health.onlineNow)],
              [t("Phones with notifications"), String(health.pushDevices)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-[var(--field)] px-3 py-2.5">
                <dt className="text-xs text-[var(--ink-2)]">{label}</dt>
                <dd className="mt-0.5 text-lg font-semibold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-[var(--ink-3)]">
            {t(
              "Database running time (Neon’s monthly compute allowance) isn’t visible from here; check it in the Neon console. The app slows its checks when people are idle to keep it low.",
            )}
          </p>
        </div>
      </Section>

      <Section
        title={t("Security")}
        hint={t(
          "Alerts appear when an account is locked after 5 wrong passwords, or a network address is blocked after too many failed sign-ins.",
        )}
      >
        <div className="px-1 pb-2">
          {alerts.length === 0 ? (
            <p className="px-2 pb-2 text-sm text-[var(--ink-2)]">
              {t("No alerts in the last 30 days.")}
            </p>
          ) : null}
          <ul className="space-y-1">
            {alerts.map((alert) => {
              const person = people.find((p) => p.id === alert.userId);
              const stillLocked = person?.lockedUntil && person.lockedUntil > now;
              const ipAlert = alert.kind === "ip_blocked";
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
                    {ipAlert ? (
                      <p className="text-sm">
                        {t(
                          "Sign-ins from {address} blocked for {minutes} minutes after {n} failed attempts",
                          {
                            address: alert.detail ?? "",
                            minutes: IP_WINDOW_MINUTES,
                            n: IP_FAILURE_LIMIT,
                          },
                        )}
                      </p>
                    ) : (
                      <p className="text-sm">
                        <span className="font-semibold">
                          {person?.displayName ?? t("Removed user")}
                        </span>
                        {person ? (
                          <span className="text-[var(--ink-2)]"> (@{person.username})</span>
                        ) : null}
                        {t(": locked after 5 failed sign-in attempts")}
                      </p>
                    )}
                    <p className="text-xs text-[var(--ink-3)] tabular-nums">
                      <LocalTime iso={alert.createdAt.toISOString()} />
                      {stillLocked ? ` · ${t("still locked")}` : ""}
                    </p>
                  </div>
                  {ipAlert && alert.detail ? (
                    <ActionForm
                      action={unblockAddress}
                      submitLabel={t("Unblock")}
                      submitClassName="btn-quiet btn-sm"
                    >
                      <input type="hidden" name="ip" value={alert.detail} />
                    </ActionForm>
                  ) : null}
                  {!ipAlert && stillLocked && person ? (
                    <ActionForm
                      action={unlockUser}
                      submitLabel={t("Unlock now")}
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
                submitLabel={t("Mark {n} as seen", { n: unseen })}
                submitClassName="btn-quiet btn-sm"
              />
            </div>
          ) : null}
        </div>
      </Section>

      <Section
        title={t("Emergency")}
        hint={t("Use these only if something has gone wrong. Each asks for confirmation.")}
      >
        <EmergencyPanel loginsDisabled={loginsDisabled} />
      </Section>

      <Section title={t("People")} hint={t("Only people listed here can sign in.")}>
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
                        {isOwner ? ` · ${t("admin")}` : ""}
                        {!person.publicKey ? ` · ${t("hasn't signed in")}` : ""}
                        {person.lockedUntil && person.lockedUntil > new Date()
                          ? ` · ${t("locked out")}`
                          : ""}
                      </span>
                    </span>
                  </>
                }
              >
                <ActionForm action={renameUser} submitLabel={t("Save name")} className="space-y-2">
                  <input type="hidden" name="userId" value={person.id} />
                  <input
                    name="displayName"
                    defaultValue={person.displayName}
                    className="field"
                    aria-label={t("Display name")}
                  />
                </ActionForm>
                <ActionForm
                  action={resetPassword}
                  submitLabel={t("Reset password")}
                  submitClassName="btn-quiet btn-sm"
                  resetOnSuccess
                  confirm={t(
                    "Reset {name}’s password? They’ll be signed out and won’t be able to read earlier messages.",
                    { name: person.displayName },
                  )}
                  className="space-y-2"
                >
                  <input type="hidden" name="userId" value={person.id} />
                  <input
                    name="password"
                    type="text"
                    autoComplete="off"
                    placeholder={t("New password")}
                    className="field"
                    aria-label={t("New password")}
                  />
                </ActionForm>
                {!isOwner ? (
                  <ActionForm
                    action={deleteUser}
                    submitLabel={t("Remove person")}
                    submitClassName="btn-danger btn-sm"
                    confirm={t("Remove {name}? Their private chats are deleted too.", {
                      name: person.displayName,
                    })}
                  >
                    <input type="hidden" name="userId" value={person.id} />
                  </ActionForm>
                ) : null}
              </Disclosure>
            );
          })}
        </div>
        <div className="mx-1 mt-2 rounded-2xl bg-[var(--glass)] p-3">
          <p className="mb-3 font-medium">{t("Add a person")}</p>
          <ActionForm
            action={createUser}
            submitLabel={t("Add")}
            resetOnSuccess
            className="space-y-2"
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                name="displayName"
                placeholder={t("Display name")}
                required
                className="field"
                aria-label={t("Display name")}
              />
              <input
                name="username"
                placeholder={t("username")}
                required
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="field"
                aria-label={t("Username")}
              />
            </div>
            <input
              name="password"
              type="text"
              autoComplete="off"
              placeholder={t("Initial password (min 8)")}
              required
              className="field"
              aria-label={t("Password")}
            />
          </ActionForm>
        </div>
      </Section>

      <Section title={t("Groups")} hint={t("Only you can create groups and change who’s in them.")}>
        <div>
          {groups.length === 0 ? (
            <p className="px-3 pb-2 text-sm text-[var(--ink-2)]">{t("No groups yet.")}</p>
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
                        .join(", ") || t("No members")}
                    </span>
                  </span>
                }
              >
                <ActionForm
                  action={updateGroup}
                  submitLabel={t("Save group")}
                  className="space-y-3"
                >
                  <input type="hidden" name="groupId" value={group.id} />
                  <input
                    name="name"
                    defaultValue={group.name ?? ""}
                    className="field"
                    aria-label={t("Group name")}
                  />
                  <MemberPicker people={people} selected={selected} t={t} />
                  <AnnouncementToggle defaultChecked={group.announcement} t={t} />
                </ActionForm>
                <ActionForm
                  action={deleteGroup}
                  submitLabel={t("Delete group")}
                  submitClassName="btn-danger btn-sm"
                  confirm={t("Delete {name} and all its messages?", { name: group.name ?? "" })}
                >
                  <input type="hidden" name="groupId" value={group.id} />
                </ActionForm>
              </Disclosure>
            );
          })}
        </div>
        <div className="mx-1 mt-2 rounded-2xl bg-[var(--glass)] p-3">
          <p className="mb-3 font-medium">{t("New group")}</p>
          <ActionForm
            action={createGroup}
            submitLabel={t("Create group")}
            resetOnSuccess
            className="space-y-3"
          >
            <input
              name="name"
              placeholder={t("Group name")}
              required
              className="field"
              aria-label={t("Group name")}
            />
            <MemberPicker people={people} selected={new Set([me.id])} t={t} />
            <AnnouncementToggle t={t} />
          </ActionForm>
        </div>
      </Section>

      <Section
        title={t("Messages")}
        hint={t("Messages are deleted from the server this many hours after they’re sent.")}
      >
        <div className="px-3 pb-3">
          <ActionForm
            action={saveSettings}
            submitLabel={t("Save")}
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
                aria-label={t("Hours")}
              />
              <span className="text-sm text-[var(--ink-2)]">{t("hours")}</span>
            </label>
          </ActionForm>
          <ActionForm
            action={savePhotoSettings}
            submitLabel={t("Save")}
            className="mt-4 space-y-3 border-t border-[var(--hairline)] pt-4"
          >
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                name="photosAllowed"
                defaultChecked={photosAllowed}
                className="mt-0.5 size-4 accent-[var(--ink)]"
              />
              <span>
                <span className="block text-sm font-medium">{t("Allow ordinary photos")}</span>
                <span className="block text-xs text-[var(--ink-2)]">
                  {t(
                    "Photos that stay in the chat until the message expires. When off, only one-time photos can be sent: each person can view them once, then they’re deleted.",
                  )}
                </span>
              </span>
            </label>
          </ActionForm>
        </div>
      </Section>
      <Section
        title={t("Activity")}
        hint={t("What was changed here, newest first. Kept for 90 days.")}
      >
        <div className="px-3 pb-3">
          {activity.length === 0 ? (
            <p className="text-sm text-[var(--ink-2)]">{t("Nothing yet.")}</p>
          ) : null}
          <ul className="divide-y divide-[var(--hairline)]">
            {activity.map((entry) => (
              <li key={entry.id} className="flex items-start gap-3 py-2.5">
                <History
                  size={15}
                  className={`mt-0.5 shrink-0 ${entry.action.startsWith("panic.") ? "text-[var(--danger)]" : "text-[var(--ink-3)]"}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{entry.detail ?? entry.action}</p>
                  <p className="text-xs text-[var(--ink-3)] tabular-nums">
                    <LocalTime iso={entry.createdAt.toISOString()} />
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Section>
    </main>
  );
}
