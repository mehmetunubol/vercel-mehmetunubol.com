import { asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { db } from "@/lib/db";
import { conversationMembers, conversations, users } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/session";
import { getMessageTtlHours } from "@/lib/settings";
import { ADMIN_USERNAME, MAX_MESSAGE_TTL_HOURS, MIN_MESSAGE_TTL_HOURS } from "@/lib/constants";
import { ActionForm } from "@/components/action-form";
import { Avatar } from "@/components/avatar";
import {
  createGroup,
  createUser,
  deleteGroup,
  deleteUser,
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

  const [people, groups, members, ttlHours] = await Promise.all([
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
  ]);
  const membersOf = (groupId: string) =>
    new Set(members.filter((m) => m.conversationId === groupId).map((m) => m.userId));
  const nameOf = new Map(people.map((p) => [p.id, p.displayName]));

  return (
    <main className="safe-top mx-auto w-full max-w-3xl space-y-4 px-4 pb-32 sm:px-6">
      <header className="pt-4 pb-1">
        <p className="eyebrow">Administration</p>
        <h1 className="mt-1 text-3xl font-semibold">People &amp; groups</h1>
      </header>

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
                    <span className="block truncate font-medium">{group.name}</span>
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
