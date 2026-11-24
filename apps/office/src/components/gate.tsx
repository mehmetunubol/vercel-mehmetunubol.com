"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Check, Plus, X } from "lucide-react";
import { cn } from "@repo/ui";
import { LoginForm } from "@/components/login-form";

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

const STARTER_TASKS: Task[] = [
  { id: "1", text: "Water the plants", done: true },
  { id: "2", text: "Pay the electricity bill", done: false },
  { id: "3", text: "Call the dentist", done: false },
  { id: "4", text: "Buy bread and milk", done: false },
  { id: "5", text: "30-minute walk", done: true },
];

function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Task[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Storage blocked or corrupt: fall back to the starter list.
  }
  return STARTER_TASKS;
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
function useToday() {
  // A string snapshot: React compares snapshots by identity, so no fresh objects here.
  const value = useSyncExternalStore(
    noSubscribe,
    () => {
      const now = new Date();
      return `${now.toLocaleDateString("en-GB", { weekday: "long" })}|${now.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}`;
    },
    () => "",
  );
  if (!value) return null;
  const [weekday, date] = value.split("|");
  return { weekday: weekday!, date: date! };
}

export function Gate() {
  const [open, setOpen] = useState(false);
  const taps = useRef<{ count: number; last: number }>({ count: 0, last: 0 });
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [draft, setDraft] = useState("");
  const today = useToday();

  // Load after mount (localStorage isn't available on the server).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read from the browser
    setTasks(loadTasks());
  }, []);

  function update(next: Task[]) {
    setTasks(next);
    saveTasks(next);
  }

  function onSecretTap() {
    const now = Date.now();
    const t = taps.current;
    t.count = now - t.last <= MAX_GAP_MS ? t.count + 1 : 1;
    t.last = now;
    if (t.count >= TAPS_TO_OPEN) {
      t.count = 0;
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
  const done = list.filter((t) => t.done).length;

  return (
    <main className="safe-top safe-bottom mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 pt-10 pb-8">
      {/* The secret: three quick taps on the date open sign-in. Looks like a plain heading. */}
      <p className="eyebrow">{today?.weekday ?? " "}</p>
      <h1
        onClick={onSecretTap}
        className="mt-1 cursor-default text-[2rem] leading-tight font-semibold select-none"
      >
        {today?.date ?? " "}
      </h1>
      <p className="mt-1 text-[15px] text-[var(--ink-2)] tabular-nums">
        {tasks ? (list.length ? `${done} of ${list.length} done` : "Nothing planned yet") : " "}
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
          placeholder="Add a task"
          aria-label="Add a task"
          className="min-w-0 flex-1 bg-transparent py-2 text-base outline-none placeholder:text-[var(--ink-3)]"
        />
        <button
          type="submit"
          aria-label="Add"
          disabled={!draft.trim()}
          className="btn btn-primary size-10 shrink-0 p-0"
        >
          <Plus size={20} />
        </button>
      </form>

      <section className="glass mt-4 rounded-[1.75rem] p-2" aria-label="Today's list">
        <h2 className="eyebrow px-3 pt-3 pb-2">Today&rsquo;s list</h2>
        {tasks && list.length === 0 ? (
          <p className="px-3 pb-3 text-sm text-[var(--ink-2)]">
            Add something you&rsquo;d like to get done today.
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
                  update(list.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)))
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
                aria-label={`Remove ${task.text}`}
                onClick={() => update(list.filter((t) => t.id !== task.id))}
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
          onClick={() => update(list.filter((t) => !t.done))}
          className="btn btn-quiet btn-sm mt-4 self-start"
        >
          Clear completed
        </button>
      ) : null}
    </main>
  );
}
