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

export function ChecklistApp() {
  const [checklist, setChecklist] = useState<ChecklistKey>("invoices");
  const [state, setState] = useState<ChecklistState | null>(null);
  const [defaults, setDefaults] = useState<ChecklistDefaults>(EMPTY_DEFAULTS);
  const [showDefaults, setShowDefaults] = useState(false);
  const [month, setMonth] = useState(() => currentMonthKey());
  const [generatingSummary, setGeneratingSummary] = useState(false);
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
    setState(null);
    setDefaults(EMPTY_DEFAULTS);
    setChecklist(key);
  }

  // Debounced so rapid edits (e.g. fast typing) collapse into one PATCH
  // instead of firing a request per keystroke — overlapping requests could
  // otherwise race Drive's find-or-create-by-name check and each create a
  // duplicate file, since Drive allows multiple files with the same name.
  const defaultsWriteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDefaultsRef = useRef<ChecklistDefaults | null>(null);

  const persistDefaults = useCallback(
    (next: ChecklistDefaults) => {
      setDefaults(next);
      pendingDefaultsRef.current = next;
      if (defaultsWriteTimer.current) clearTimeout(defaultsWriteTimer.current);
      defaultsWriteTimer.current = setTimeout(() => {
        defaultsWriteTimer.current = null;
        const toSend = pendingDefaultsRef.current;
        pendingDefaultsRef.current = null;
        if (!toSend) return;
        void fetch(`/api/defaults?checklist=${checklist}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toSend),
        });
      }, 700);
    },
    [checklist],
  );

  function handleFieldDefaultChange(key: string, value: string) {
    void persistDefaults({ ...defaults, fields: { ...defaults.fields, [key]: value } });
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

  // Same debouncing rationale as persistDefaults above.
  const stateWriteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingStateRef = useRef<ChecklistState | null>(null);

  const persist = useCallback(
    (next: ChecklistState) => {
      setState(next);
      pendingStateRef.current = next;
      if (stateWriteTimer.current) clearTimeout(stateWriteTimer.current);
      stateWriteTimer.current = setTimeout(() => {
        stateWriteTimer.current = null;
        const toSend = pendingStateRef.current;
        pendingStateRef.current = null;
        if (!toSend) return;
        void fetch(`/api/state?checklist=${checklist}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toSend),
        });
      }, 700);
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
    updateMonthState((prev) => ({ ...prev, fields: { ...prev.fields, [key]: value } }));
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
      return { ...prev, [key]: list };
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
        </div>
      </div>
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
