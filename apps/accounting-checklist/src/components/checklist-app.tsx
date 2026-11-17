"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MonthPicker } from "@/components/month-picker";
import { ChecklistItem } from "@/components/checklist-item";
import { DefaultsPanel } from "@/components/defaults-panel";
import { PaymentsTotals } from "@/components/payments-totals";
import {
  CHECKLISTS,
  CHECKLIST_KEYS,
  DEFAULT_CREDIT_CARDS,
  EMPTY_DEFAULTS,
  computeItemsTotal,
  currentMonthKey,
  emptyMonthState,
  type ChecklistDefaults,
  type ChecklistKey,
  type ChecklistState,
  type MonthState,
  type RepeatableKey,
} from "@/lib/checklist";
import { createWriteQueue, enqueueWrite, flushWrites } from "@/lib/write-queue";
import { planReportEmail } from "@/lib/report-email";

const GMAIL_ERROR_MESSAGES: Record<string, string> = {
  gmail_scope: "Gmail access isn't granted yet — sign out and sign back in once to allow creating drafts.",
  gmail_auth: "Your Google session expired — sign out and sign back in.",
  gmail_api_disabled:
    "The Gmail API isn't enabled for this app's Google Cloud project — enable it in Google Cloud Console, then try again.",
  gmail_rate_limit: "Gmail is rate-limiting requests right now — wait a minute and try again.",
  no_files: "Nothing uploaded for this month yet.",
};

export function ChecklistApp() {
  const [checklist, setChecklist] = useState<ChecklistKey>("invoices");
  const [state, setState] = useState<ChecklistState | null>(null);
  const [defaults, setDefaults] = useState<ChecklistDefaults>(EMPTY_DEFAULTS);
  const [showDefaults, setShowDefaults] = useState(false);
  const [month, setMonth] = useState(() => currentMonthKey());
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [creatingDraft, setCreatingDraft] = useState(false);
  // Tagged with the month it belongs to, so it isn't shown under another
  // month after the picker changes.
  const [draftNotice, setDraftNotice] = useState<{
    month: string;
    tone: "ok" | "error";
    text: string;
    href?: string;
  } | null>(null);
  const [invoicesState, setInvoicesState] = useState<ChecklistState | null>(null);

  useEffect(() => {
    fetch(`/api/state?checklist=${checklist}`)
      .then((res) => res.json())
      .then(setState);
    fetch(`/api/defaults?checklist=${checklist}`)
      .then((res) => res.json())
      .then(setDefaults);
  }, [checklist]);

  // Payments' totals section references the matching month's SMM invoice
  // (EURO/TRY/rate) for context — fetched only while viewing Payments, and
  // refreshed whenever the viewed month changes.
  useEffect(() => {
    if (checklist !== "payments") return;
    fetch(`/api/state?checklist=invoices`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setInvoicesState)
      .catch(() => setInvoicesState(null));
  }, [checklist, month]);

  function selectChecklist(key: ChecklistKey) {
    // Send any edits for the checklist being left right away (each write is
    // bound to its own checklist's URL, so this is about promptness).
    void flushWrites(stateWrites.current);
    void flushWrites(defaultsWrites.current);
    setState(null);
    setDefaults(EMPTY_DEFAULTS);
    setChecklist(key);
  }

  // Debounced, ordered writes — see lib/write-queue.ts.
  const defaultsWrites = useRef(createWriteQueue<ChecklistDefaults>());
  const stateWrites = useRef(createWriteQueue<ChecklistState>());

  const persistDefaults = useCallback(
    (next: ChecklistDefaults) => {
      setDefaults(next);
      enqueueWrite(defaultsWrites.current, `/api/defaults?checklist=${checklist}`, next);
    },
    [checklist],
  );

  function handleFieldDefaultChange(key: string, value: string) {
    // Clearing a field removes the key, so the field falls back to its
    // built-in default (if any) instead of storing a blank override.
    const fields = { ...defaults.fields };
    if (value === "") delete fields[key];
    else fields[key] = value;
    void persistDefaults({ ...defaults, fields });
  }

  function handleCreditCardDefaultChange(cardId: string, patch: { amount?: string; dueDate?: string }) {
    void persistDefaults({
      ...defaults,
      creditCards: {
        ...defaults.creditCards,
        [cardId]: { ...defaults.creditCards[cardId], ...patch },
      },
    });
  }

  const persist = useCallback(
    (next: ChecklistState) => {
      setState(next);
      enqueueWrite(stateWrites.current, `/api/state?checklist=${checklist}`, next);
    },
    [checklist],
  );

  const items = CHECKLISTS[checklist].items;

  if (!state) {
    return (
      <div className="space-y-4">
        <div className="h-9 w-48 animate-pulse rounded-lg bg-neutral-500/10" />
        <div className="space-y-4">
          {items.map((def) => (
            <div key={def.index} className="h-16 animate-pulse rounded-lg bg-neutral-500/5" />
          ))}
        </div>
      </div>
    );
  }

  const currentState = state;
  const monthState = currentState.months[month] ?? emptyMonthState();
  const doneCount = items.filter((def) => monthState.items[def.index]).length;

  function updateMonthState(mutate: (prev: typeof monthState) => typeof monthState) {
    const next: ChecklistState = {
      months: { ...currentState.months, [month]: mutate(monthState) },
    };
    void persist(next);
  }

  function handleToggle(index: number, done: boolean) {
    updateMonthState((prev) => ({ ...prev, items: { ...prev.items, [index]: done } }));
  }

  function handleFieldChange(key: string, value: string) {
    updateMonthState((prev) => ({
      ...prev,
      fields: { ...prev.fields, [key]: value },
      autoFilled: prev.autoFilled.filter((k) => k !== key),
    }));
  }

  async function handleUpload(index: number, file: File) {
    const def = items.find((d) => d.index === index);
    const label = def?.fileLabel ?? def?.title ?? "Attachment";
    const extension = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
    const existingCount = monthState.files.filter((f) => f.itemIndex === index).length;
    const suffix = existingCount > 0 ? ` (${existingCount + 1})` : "";
    const uploadName = `${label}${suffix}${extension}`;

    const formData = new FormData();
    formData.append("file", file, uploadName);
    formData.append("month", month);
    formData.append("checklist", checklist);

    const response = await fetch("/api/upload", { method: "POST", body: formData });
    if (!response.ok) return;
    const uploaded = (await response.json()) as { id: string; webViewLink: string };

    updateMonthState((prev) => ({
      ...prev,
      files: [
        ...prev.files,
        { itemIndex: index, driveFileId: uploaded.id, name: uploadName, webViewLink: uploaded.webViewLink },
      ],
    }));
  }

  function handleAddEntry(key: RepeatableKey) {
    updateMonthState((prev) => ({
      ...prev,
      [key]: [...prev[key], { id: crypto.randomUUID(), label: "", amount: "", dueDate: "", done: false }],
    }));
  }

  function handleEntryChange(key: RepeatableKey, id: string, patch: Partial<MonthState[typeof key][number]>) {
    updateMonthState((prev) => {
      const exists = prev[key].some((e) => e.id === id);
      const list = exists
        ? prev[key].map((e) => (e.id === id ? { ...e, ...patch } : e))
        : [
            ...prev[key],
            {
              id,
              label: DEFAULT_CREDIT_CARDS.find((d) => d.id === id)?.label ?? "",
              amount: "",
              dueDate: "",
              done: false,
              ...patch,
            },
          ];
      return { ...prev, [key]: list, autoFilled: prev.autoFilled.filter((k) => k !== `${key}:${id}`) };
    });
  }

  function handleRemoveEntry(key: RepeatableKey, id: string) {
    updateMonthState((prev) => ({ ...prev, [key]: prev[key].filter((e) => e.id !== id) }));
  }

  async function handleGenerateSummary() {
    setGeneratingSummary(true);
    try {
      const response = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, checklist }),
      });
      if (!response.ok) return;
      const doc = (await response.json()) as { id: string; webViewLink: string };
      updateMonthState((prev) => ({
        ...prev,
        summary: { fileId: doc.id, webViewLink: doc.webViewLink },
      }));
      window.open(doc.webViewLink, "_blank");
    } finally {
      setGeneratingSummary(false);
    }
  }

  async function handleCreateDraft() {
    const missing = planReportEmail(items, monthState, month).missing.map((title) => `• ${title}`);
    if (
      missing.length > 0 &&
      !window.confirm(`These documents aren't uploaded yet:\n\n${missing.join("\n")}\n\nCreate the draft anyway?`)
    ) {
      return;
    }

    // Open the tab now, while the click still counts as a user gesture —
    // a window.open after the awaits below would be popup-blocked. It's
    // pointed at the draft once it exists, or closed on failure.
    const draftWindow = window.open("", "_blank");
    if (draftWindow) {
      // Sever the back-reference before it navigates anywhere, so pages
      // later opened in that tab can't redirect this one (tabnabbing).
      draftWindow.opener = null;
      draftWindow.document.write("<p style='font-family:sans-serif'>Preparing Gmail draft…</p>");
    }

    const draftMonth = month;
    setCreatingDraft(true);
    setDraftNotice(null);
    try {
      // Flush both debounced writes (e.g. an accountant email just typed in
      // the month or in Defaults) so the server reads what the user sees.
      // Also waits for a save that's already on its way to Drive.
      const [stateSaved, defaultsSaved] = await Promise.all([
        flushWrites(stateWrites.current),
        flushWrites(defaultsWrites.current),
      ]);
      if (!stateSaved || !defaultsSaved) {
        draftWindow?.close();
        setDraftNotice({
          month: draftMonth,
          tone: "error",
          text: "Couldn't save your latest changes, so no draft was created. Try again.",
        });
        return;
      }

      const response = await fetch("/api/report-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: draftMonth }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        gmailUrl?: string;
        attachedCount?: number;
        linkedCount?: number;
        to?: string | null;
      };

      if (!response.ok || !result.gmailUrl) {
        draftWindow?.close();
        setDraftNotice({
          month: draftMonth,
          tone: "error",
          text: (result.error && GMAIL_ERROR_MESSAGES[result.error]) ?? "Couldn't create the Gmail draft. Try again.",
        });
        return;
      }

      const parts = [`Draft created with ${result.attachedCount} attachment(s)`];
      if (result.linkedCount) parts.push(`${result.linkedCount} too large, added as Drive links`);
      if (!result.to) parts.push("no recipient set — add the accountant email in Defaults");
      setDraftNotice({ month: draftMonth, tone: "ok", text: `${parts.join(" · ")}.`, href: result.gmailUrl });
      if (draftWindow) draftWindow.location.href = result.gmailUrl;
    } catch {
      draftWindow?.close();
      setDraftNotice({ month: draftMonth, tone: "error", text: "Couldn't create the Gmail draft. Try again." });
    } finally {
      setCreatingDraft(false);
    }
  }

  const allDone = doneCount === items.length;

  const invoicesMonthState = invoicesState?.months?.[month];
  const incomingEuro = invoicesMonthState?.fields.euro;
  const incomingTry = invoicesMonthState?.fields.bankAmount;
  const incomingRate = invoicesMonthState?.fields.alisKur;
  const outgoingTotal = computeItemsTotal(items, monthState, defaults, month);
  const netAmount = (Number(incomingTry) || 0) - outgoingTotal;

  return (
    <div className="space-y-6">
      <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-neutral-500/5 p-1">
        {CHECKLIST_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => selectChecklist(key)}
            className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
              checklist === key
                ? "bg-accent text-accent-foreground"
                : "text-muted hover:bg-neutral-500/10 hover:text-foreground"
            }`}
          >
            {CHECKLISTS[key].title}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthPicker month={month} onChange={setMonth} />
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-neutral-500/10">
              <div
                className={`h-full rounded-full transition-all duration-300 ${allDone ? "bg-accent" : "bg-accent/60"}`}
                style={{ width: `${(doneCount / items.length) * 100}%` }}
              />
            </div>
            <span className="text-xs font-medium text-muted tabular-nums">
              {doneCount}/{items.length}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowDefaults((v) => !v)}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm font-medium transition-colors duration-150 hover:bg-neutral-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
              showDefaults ? "bg-neutral-500/10" : ""
            }`}
          >
            Defaults
          </button>
          <button
            type="button"
            onClick={handleGenerateSummary}
            disabled={generatingSummary}
            className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm font-medium transition-colors duration-150 hover:bg-neutral-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:pointer-events-none disabled:opacity-50"
          >
            {generatingSummary ? "Generating…" : "Print summary"}
          </button>
          {checklist === "report" ? (
            <button
              type="button"
              onClick={handleCreateDraft}
              disabled={creatingDraft}
              className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground transition-opacity duration-150 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:pointer-events-none disabled:opacity-50"
            >
              {creatingDraft ? "Preparing draft…" : "Email to accountant"}
            </button>
          ) : null}
        </div>
      </div>
      {checklist === "report" && draftNotice?.month === month ? (
        <div
          role="status"
          className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border px-3 py-2 text-sm ${
            draftNotice.tone === "ok"
              ? "border-accent/30 bg-accent/5"
              : "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
          }`}
        >
          <span>{draftNotice.text}</span>
          {draftNotice.href ? (
            <a
              href={draftNotice.href}
              target="_blank"
              rel="noreferrer"
              className="text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
            >
              Open in Gmail
            </a>
          ) : null}
        </div>
      ) : null}
      {showDefaults ? (
        <DefaultsPanel
          def={CHECKLISTS[checklist]}
          defaults={defaults}
          onFieldDefaultChange={handleFieldDefaultChange}
          onCreditCardDefaultChange={handleCreditCardDefaultChange}
        />
      ) : null}
      {monthState.summary ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <span className="text-muted">Summary ready:</span>
          <a
            href={monthState.summary.webViewLink}
            target="_blank"
            rel="noreferrer"
            className="text-accent underline decoration-accent/30 underline-offset-2 transition-colors hover:decoration-accent"
          >
            View / print
          </a>
          <a
            href={`https://docs.google.com/document/d/${monthState.summary.fileId}/export?format=pdf`}
            target="_blank"
            rel="noreferrer"
            className="text-accent underline decoration-accent/30 underline-offset-2 transition-colors hover:decoration-accent"
          >
            Download PDF
          </a>
        </div>
      ) : null}
      <div className="space-y-4">
        {items.map((def) => (
          <ChecklistItem
            key={def.index}
            def={def}
            monthState={monthState}
            defaults={defaults}
            month={month}
            onToggle={handleToggle}
            onFieldChange={handleFieldChange}
            onUpload={handleUpload}
            onAddEntry={handleAddEntry}
            onEntryChange={handleEntryChange}
            onRemoveEntry={handleRemoveEntry}
          />
        ))}
      </div>
      {checklist === "payments" ? (
        <PaymentsTotals
          incomingEuro={incomingEuro}
          incomingTry={incomingTry}
          incomingRate={incomingRate}
          outgoingTotal={outgoingTotal}
          netAmount={netAmount}
        />
      ) : null}
    </div>
  );
}
