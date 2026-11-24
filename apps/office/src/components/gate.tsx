"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CalendarDays, Check, ListTodo, Plus, Settings, StickyNote, X } from "lucide-react";
import { cn } from "@repo/ui";
import { LoginForm } from "@/components/login-form";
import { NotesPage } from "@/components/planner/notes-page";
import { SettingsPage } from "@/components/planner/settings-page";
import { WeekPage } from "@/components/planner/week-page";
import type { Locale } from "@/lib/i18n";
import { useI18n } from "@/components/i18n-provider";

type PlannerTab = "today" | "week" | "notes" | "settings";

const TABS: { id: PlannerTab; label: string; icon: typeof ListTodo }[] = [
  { id: "today", label: "Today", icon: ListTodo },
  { id: "week", label: "Week", icon: CalendarDays },
  { id: "notes", label: "Notes", icon: StickyNote },
  { id: "settings", label: "Settings", icon: Settings },
];

const TAPS_TO_OPEN = 3;
const MAX_GAP_MS = 800;

/**
 * The front page everyone sees before signing in: a small, working day
 * planner. Its list lives only in this browser (localStorage) and never
 * touches the server. Tapping the date at the top three times in quick
 * succession reveals sign-in.
 *
 * This hides the app from casual visitors; it is not a security boundary
 * (the real one is the password and the encryption).
 */

interface Task {
  id: string;
  text: string;
  done: boolean;
}

const STORAGE_KEY = "day-planner:tasks";

const STARTER_TASKS: Record<Locale, Task[]> = {
  en: [
    { id: "1", text: "Water the plants", done: true },
    { id: "2", text: "Pay the electricity bill", done: false },
    { id: "3", text: "Call the dentist", done: false },
    { id: "4", text: "Buy bread and milk", done: false },
    { id: "5", text: "30-minute walk", done: true },
  ],
  tr: [
    { id: "1", text: "Çiçekleri sula", done: true },
    { id: "2", text: "Elektrik faturasını öde", done: false },
    { id: "3", text: "Dişçiyi ara", done: false },
    { id: "4", text: "Ekmek ve süt al", done: false },
    { id: "5", text: "30 dakika yürüyüş", done: true },
  ],
};

function loadTasks(locale: Locale): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Task[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Storage blocked or corrupt: fall back to the starter list.
  }
  return STARTER_TASKS[locale];
}

function saveTasks(tasks: Task[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // Private mode etc.: the list just won't persist.
  }
}

const noSubscribe = () => () => {};

/** Today's date in the viewer's timezone (rendered in the browser only). */
function useToday(dateLocale: string) {
  // A string snapshot: React compares snapshots by identity, so no fresh objects here.
  const value = useSyncExternalStore(
    noSubscribe,
    () => {
      const now = new Date();
      return `${now.toLocaleDateString(dateLocale, { weekday: "long" })}|${now.toLocaleDateString(dateLocale, { day: "numeric", month: "long" })}`;
    },
    () => "",
  );
  if (!value) return null;
  const [weekday, date] = value.split("|");
  return { weekday: weekday!, date: date! };
}

export function Gate() {
  const { t, locale, dateLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<PlannerTab>("today");
  const taps = useRef<{ count: number; last: number }>({ count: 0, last: 0 });
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [draft, setDraft] = useState("");
  const today = useToday(dateLocale);

  // Load after mount (localStorage isn't available on the server).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read from the browser
    setTasks(loadTasks(locale));
  }, [locale]);

  function update(next: Task[]) {
    setTasks(next);
    saveTasks(next);
  }

  function onSecretTap() {
    const now = Date.now();
    const tap = taps.current;
    tap.count = now - tap.last <= MAX_GAP_MS ? tap.count + 1 : 1;
    tap.last = now;
    if (tap.count >= TAPS_TO_OPEN) {
      tap.count = 0;
      setOpen(true);
    }
  }

  if (open) {
    return (
      <main className="safe-top safe-bottom flex min-h-dvh flex-col items-center justify-center px-5">
        <div className="rise w-full max-w-sm">
          <LoginForm />
        </div>
      </main>
    );
  }

  const list = tasks ?? [];
  const done = list.filter((task) => task.done).length;

  return (
    <main className="safe-top mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 pt-10 pb-32">
      {tab === "today" ? (
        <>
          {/* The secret: three quick taps on the date open sign-in. Looks like a plain heading. */}
          <p className="eyebrow">{today?.weekday ?? " "}</p>
          <h1
            onClick={onSecretTap}
            className="mt-1 cursor-default text-[2rem] leading-tight font-semibold select-none"
          >
            {today?.date ?? " "}
          </h1>
          <p className="mt-1 text-[15px] text-[var(--ink-2)] tabular-nums">
            {tasks
              ? list.length
                ? t("{done} of {total} done", { done, total: list.length })
                : t("Nothing planned yet")
              : " "}
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const text = draft.trim();
              if (!text) return;
              update([...list, { id: `${Date.now()}`, text: text.slice(0, 120), done: false }]);
              setDraft("");
            }}
            className="glass-strong mt-6 flex items-center gap-2 rounded-full p-1.5 pl-4"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t("Add a task")}
              aria-label={t("Add a task")}
              className="min-w-0 flex-1 bg-transparent py-2 text-base outline-none placeholder:text-[var(--ink-3)]"
            />
            <button
              type="submit"
              aria-label={t("Add")}
              disabled={!draft.trim()}
              className="btn btn-primary size-10 shrink-0 p-0"
            >
              <Plus size={20} />
            </button>
          </form>

          <section className="glass mt-4 rounded-[1.75rem] p-2" aria-label={t("Today’s list")}>
            <h2 className="eyebrow px-3 pt-3 pb-2">{t("Today’s list")}</h2>
            {tasks && list.length === 0 ? (
              <p className="px-3 pb-3 text-sm text-[var(--ink-2)]">
                {t("Add something you’d like to get done today.")}
              </p>
            ) : null}
            <ul>
              {list.map((task) => (
                <li key={task.id} className="row flex items-center gap-3 px-3 py-2.5">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={task.done}
                    aria-label={task.text}
                    onClick={() =>
                      update(list.map((x) => (x.id === task.id ? { ...x, done: !x.done } : x)))
                    }
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full border transition-colors",
                      task.done
                        ? "border-transparent bg-[var(--mine)] text-[var(--mine-ink)]"
                        : "border-[var(--ink-3)]",
                    )}
                  >
                    {task.done ? <Check size={14} strokeWidth={3} /> : null}
                  </button>
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate",
                      task.done && "text-[var(--ink-3)] line-through",
                    )}
                  >
                    {task.text}
                  </span>
                  <button
                    type="button"
                    aria-label={t("Remove {task}", { task: task.text })}
                    onClick={() => update(list.filter((x) => x.id !== task.id))}
                    className="grid size-8 shrink-0 place-items-center rounded-full text-[var(--ink-3)] hover:bg-[var(--hairline)]"
                  >
                    <X size={15} />
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {done > 0 ? (
            <button
              type="button"
              onClick={() => update(list.filter((x) => !x.done))}
              className="btn btn-quiet btn-sm mt-4 self-start"
            >
              {t("Clear completed")}
            </button>
          ) : null}
        </>
      ) : tab === "week" ? (
        <WeekPage />
      ) : tab === "notes" ? (
        <NotesPage />
      ) : (
        <SettingsPage />
      )}

      <nav className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4">
        <div className="glass-strong pointer-events-auto flex gap-1 rounded-full p-1.5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-current={tab === id ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors",
                tab === id
                  ? "bg-[var(--mine)] text-[var(--mine-ink)]"
                  : "text-[var(--ink-2)] hover:text-[var(--ink)]",
              )}
            >
              <Icon size={18} strokeWidth={2} />
              <span className={tab === id ? "" : "sr-only sm:not-sr-only"}>{t(label)}</span>
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}
