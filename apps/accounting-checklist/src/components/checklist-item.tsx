"use client";

import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import {
  DEFAULT_CREDIT_CARDS,
  resolveDateDefault,
  resolveFieldDefault,
  type ChecklistDefaults,
  type ChecklistItemDef,
  type CustomExpense,
  type MonthState,
  type RepeatableKey,
} from "@/lib/checklist";
import { ItemIcon } from "@/components/checklist-icons";

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
      <path
        d="M4 10.5l3.5 3.5L16 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M10 13V4m0 0L6.5 7.5M10 4l3.5 3.5M4 14.5v1a1.5 1.5 0 0 0 1.5 1.5h9a1.5 1.5 0 0 0 1.5-1.5v-1"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronDownIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={`h-4 w-4 shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
      aria-hidden="true"
    >
      <path
        d="M5 8l5 5 5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M5 6h10M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6m1.5 0-.6 9a1.5 1.5 0 0 1-1.5 1.4H8.6a1.5 1.5 0 0 1-1.5-1.4L6.5 6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function ChecklistItem({
  def,
  monthState,
  defaults,
  month,
  onToggle,
  onFieldChange,
  onUpload,
  onAddEntry,
  onEntryChange,
  onRemoveEntry,
}: {
  def: ChecklistItemDef;
  monthState: MonthState;
  defaults: ChecklistDefaults;
  month: string;
  onToggle: (index: number, done: boolean) => void;
  onFieldChange: (key: string, value: string) => void;
  onUpload: (index: number, file: File) => void;
  onAddEntry: (key: RepeatableKey) => void;
  onEntryChange: (key: RepeatableKey, id: string, patch: Partial<CustomExpense>) => void;
  onRemoveEntry: (key: RepeatableKey, id: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const done = monthState.items[def.index] ?? false;
  const filesForItem = monthState.files.filter((f) => f.itemIndex === def.index);
  const expandable = def.fields.length > 0 || def.hasFile || Boolean(def.repeatableKey);

  // Default entries (e.g. the 3 preset credit cards) show up every month
  // until the user actually edits one — at that point onEntryChange upserts
  // it into the real, persisted list. Virtual rows have no remove button
  // since there's nothing persisted yet to remove.
  const repeatableKey = def.repeatableKey;
  const realEntries = repeatableKey ? monthState[repeatableKey] : [];
  const cardTemplates = repeatableKey === "creditCards" ? DEFAULT_CREDIT_CARDS : [];
  const virtualEntries = cardTemplates
    .filter((d) => !realEntries.some((e) => e.id === d.id))
    .map((d): CustomExpense => {
      const cardDefault = defaults.creditCards[d.id];
      return {
        id: d.id,
        label: d.label,
        amount: cardDefault?.amount ?? "",
        dueDate: resolveDateDefault(month, cardDefault?.dueDate) ?? "",
        done: false,
      };
    });
  const entries = [...realEntries, ...virtualEntries];

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await onUpload(def.index, file);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <Card className={`transition-colors duration-200 ${done ? "border-accent/30" : ""}`}>
      <CardHeader
        onClick={() => expandable && setExpanded((v) => !v)}
        className={`flex flex-row items-center justify-between gap-3 space-y-0 p-4 sm:p-5 ${
          expandable ? "cursor-pointer" : ""
        }`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {expandable ? <ChevronDownIcon expanded={expanded} /> : null}
          <span
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${
              done ? "bg-accent/10 text-accent" : "bg-neutral-500/10 text-muted"
            }`}
          >
            <ItemIcon name={def.icon} />
          </span>
          <CardTitle className="truncate text-[0.95rem] font-medium">{def.title}</CardTitle>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(def.index, !done);
          }}
          className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
            done
              ? "bg-accent/10 text-accent hover:bg-accent/20"
              : "bg-neutral-500/10 text-muted hover:bg-neutral-500/20"
          }`}
        >
          {done ? <CheckIcon /> : null}
          {done ? "Done" : "Pending"}
        </button>
      </CardHeader>
      {expandable && expanded ? (
        <CardContent className="grid gap-3 p-4 pt-0 sm:grid-cols-2 sm:p-5 sm:pt-0">
          {def.fields.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <label className="text-xs font-medium text-muted">{field.label}</label>
              <input
                type={field.type}
                value={
                  monthState.fields[field.key] ??
                  resolveFieldDefault(field.type, month, defaults.fields[field.key]) ??
                  ""
                }
                onChange={(e) => onFieldChange(field.key, e.target.value)}
                className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm transition-colors duration-150 focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              />
            </div>
          ))}
          {repeatableKey ? (
            <div className="space-y-2 sm:col-span-2">
              {entries.map((entry) => {
                const isReal = realEntries.some((e) => e.id === entry.id);
                return (
                  <div key={entry.id} className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onEntryChange(repeatableKey, entry.id, { done: !entry.done })}
                      aria-label={entry.done ? "Mark pending" : "Mark done"}
                      className={`grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded-full border-2 transition-colors duration-200 ${
                        entry.done
                          ? "border-accent bg-accent text-accent-foreground"
                          : "border-border text-transparent"
                      }`}
                    >
                      <CheckIcon />
                    </button>
                    <input
                      type="text"
                      placeholder="Name"
                      value={entry.label}
                      onChange={(e) => onEntryChange(repeatableKey, entry.id, { label: e.target.value })}
                      className="min-w-[120px] flex-1 rounded-md border border-border bg-transparent px-3 py-2 text-sm transition-colors duration-150 focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                    />
                    <input
                      type="number"
                      placeholder="Amount"
                      value={entry.amount ?? ""}
                      onChange={(e) => onEntryChange(repeatableKey, entry.id, { amount: e.target.value })}
                      className="w-24 shrink-0 rounded-md border border-border bg-transparent px-3 py-2 text-sm transition-colors duration-150 focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 sm:w-28"
                    />
                    <input
                      type="date"
                      aria-label="Due date"
                      value={entry.dueDate ?? ""}
                      onChange={(e) => onEntryChange(repeatableKey, entry.id, { dueDate: e.target.value })}
                      className="w-32 shrink-0 rounded-md border border-border bg-transparent px-3 py-2 text-sm transition-colors duration-150 focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 sm:w-36"
                    />
                    {isReal ? (
                      <button
                        type="button"
                        onClick={() => onRemoveEntry(repeatableKey, entry.id)}
                        aria-label="Remove"
                        className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-md text-muted transition-colors duration-150 hover:bg-neutral-500/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                      >
                        <TrashIcon />
                      </button>
                    ) : (
                      <span className="w-9 shrink-0" aria-hidden="true" />
                    )}
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => onAddEntry(repeatableKey)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors duration-150 hover:bg-neutral-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                <PlusIcon />
                {def.addEntryLabel ?? "Add item"}
              </button>
            </div>
          ) : null}
          {def.hasFile ? (
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-muted">{def.fileLabel}</label>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors duration-150 hover:bg-neutral-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:pointer-events-none disabled:opacity-50"
                >
                  <UploadIcon />
                  {uploading ? "Uploading…" : "Upload file"}
                </button>
                <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" />
              </div>
              {filesForItem.length > 0 ? (
                <ul className="space-y-1 pt-1">
                  {filesForItem.map((f) => (
                    <li key={f.driveFileId}>
                      <a
                        href={f.webViewLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-accent underline decoration-accent/30 underline-offset-2 transition-colors hover:decoration-accent"
                      >
                        {f.name}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      ) : null}
    </Card>
  );
}
