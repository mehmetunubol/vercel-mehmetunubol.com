"use client";

import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@repo/ui";
import type { ChecklistItemDef, MonthState } from "@/lib/checklist";

export function ChecklistItem({
  def,
  monthState,
  onToggle,
  onFieldChange,
  onUpload,
}: {
  def: ChecklistItemDef;
  monthState: MonthState;
  onToggle: (index: number, done: boolean) => void;
  onFieldChange: (key: string, value: string) => void;
  onUpload: (index: number, file: File) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const done = monthState.items[def.index] ?? false;
  const filesForItem = monthState.files.filter((f) => f.itemIndex === def.index);

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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={done}
            onChange={(e) => onToggle(def.index, e.target.checked)}
            className="h-4 w-4 accent-accent"
            aria-label={`${def.title} done`}
          />
          <CardTitle className="text-base">{def.title}</CardTitle>
        </div>
        <Badge variant={done ? "accent" : "outline"}>{done ? "Done" : "Pending"}</Badge>
      </CardHeader>
      {def.fields.length > 0 || def.hasFile ? (
        <CardContent className="space-y-3">
          {def.fields.map((field) => (
            <div key={field.key} className="space-y-1">
              <label className="text-sm text-muted">{field.label}</label>
              <input
                type={field.type}
                value={monthState.fields[field.key] ?? ""}
                onChange={(e) => onFieldChange(field.key, e.target.value)}
                className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
            </div>
          ))}
          {def.hasFile ? (
            <div className="space-y-1">
              <label className="text-sm text-muted">{def.fileLabel}</label>
              <div className="flex items-center gap-2">
                <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="text-sm" />
                {uploading ? <span className="text-sm text-muted">Uploading…</span> : null}
              </div>
              {filesForItem.length > 0 ? (
                <ul className="space-y-1 text-sm">
                  {filesForItem.map((f) => (
                    <li key={f.driveFileId}>
                      <a
                        href={f.webViewLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent underline"
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
