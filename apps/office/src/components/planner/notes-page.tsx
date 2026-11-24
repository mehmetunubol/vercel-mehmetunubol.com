"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { loadLocal, saveLocal } from "@/lib/planner-storage";

interface Note {
  id: string;
  text: string;
}

const KEY = "day-planner:notes";
const STARTER: Note[] = [
  { id: "1", text: "Shopping: eggs, tomatoes, olive oil, coffee" },
  { id: "2", text: "Book recommendations from Sunday: The Midnight Library, Klara and the Sun" },
];

export function NotesPage() {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read from the browser
    setNotes(loadLocal(KEY, STARTER));
  }, []);

  function update(next: Note[]) {
    setNotes(next);
    saveLocal(KEY, next);
  }

  const list = notes ?? [];
  return (
    <>
      <p className="eyebrow">{list.length === 1 ? "1 note" : `${list.length} notes`}</p>
      <h1 className="mt-1 text-[2rem] leading-tight font-semibold">Notes</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const text = draft.trim();
          if (!text) return;
          update([{ id: `${Date.now()}`, text: text.slice(0, 500) }, ...list]);
          setDraft("");
        }}
        className="glass-strong mt-6 flex items-end gap-2 rounded-[1.6rem] p-1.5 pl-4"
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={1}
          placeholder="Write a note"
          aria-label="Write a note"
          className="field-sizing-content max-h-40 min-h-10 flex-1 resize-none bg-transparent py-2 text-base outline-none placeholder:text-[var(--ink-3)]"
        />
        <button
          type="submit"
          aria-label="Save note"
          disabled={!draft.trim()}
          className="btn btn-primary size-10 shrink-0 p-0"
        >
          <Plus size={20} />
        </button>
      </form>
      <ul className="mt-4 space-y-2" aria-label="Notes">
        {list.map((note) => (
          <li
            key={note.id}
            className="glass flex items-start gap-3 rounded-[1.25rem] py-3 pr-2 pl-4"
          >
            <p className="min-w-0 flex-1 text-[15px] leading-relaxed whitespace-pre-wrap">
              {note.text}
            </p>
            <button
              type="button"
              aria-label="Delete note"
              onClick={() => update(list.filter((n) => n.id !== note.id))}
              className="grid size-8 shrink-0 place-items-center rounded-full text-[var(--ink-3)] hover:bg-[var(--hairline)]"
            >
              <X size={15} />
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
