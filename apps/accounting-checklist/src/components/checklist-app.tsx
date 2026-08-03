"use client";

import { useCallback, useEffect, useState } from "react";
import { MonthPicker } from "@/components/month-picker";
import { ChecklistItem } from "@/components/checklist-item";
import {
  CHECKLIST_ITEMS,
  currentMonthKey,
  emptyMonthState,
  type ChecklistState,
} from "@/lib/checklist";

export function ChecklistApp() {
  const [state, setState] = useState<ChecklistState | null>(null);
  const [month, setMonth] = useState(() => currentMonthKey());

  useEffect(() => {
    fetch("/api/state")
      .then((res) => res.json())
      .then(setState);
  }, []);

  const persist = useCallback(async (next: ChecklistState) => {
    setState(next);
    await fetch("/api/state", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
  }, []);

  if (!state) {
    return <p className="text-sm text-muted">Loading…</p>;
  }

  const currentState = state;
  const monthState = currentState.months[month] ?? emptyMonthState();

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
    const formData = new FormData();
    formData.append("file", file);
    formData.append("month", month);

    const response = await fetch("/api/upload", { method: "POST", body: formData });
    if (!response.ok) return;
    const uploaded = (await response.json()) as { id: string; webViewLink: string };

    updateMonthState((prev) => ({
      ...prev,
      files: [
        ...prev.files,
        { itemIndex: index, driveFileId: uploaded.id, name: file.name, webViewLink: uploaded.webViewLink },
      ],
    }));
  }

  return (
    <div className="space-y-6">
      <MonthPicker month={month} onChange={setMonth} />
      <div className="space-y-4">
        {CHECKLIST_ITEMS.map((def) => (
          <ChecklistItem
            key={def.index}
            def={def}
            monthState={monthState}
            onToggle={handleToggle}
            onFieldChange={handleFieldChange}
            onUpload={handleUpload}
          />
        ))}
      </div>
    </div>
  );
}
