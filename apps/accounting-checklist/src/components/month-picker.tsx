"use client";

import { Button } from "@repo/ui";

function shiftMonth(monthKey: string, delta: number): string {
  const parts = monthKey.split("-").map(Number);
  const year = parts[0] ?? new Date().getFullYear();
  const month = parts[1] ?? 1;
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function MonthPicker({
  month,
  onChange,
}: {
  month: string;
  onChange: (month: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" size="sm" onClick={() => onChange(shiftMonth(month, -1))}>
        ← Prev
      </Button>
      <span className="min-w-[6ch] text-center text-sm font-medium">{month}</span>
      <Button variant="outline" size="sm" onClick={() => onChange(shiftMonth(month, 1))}>
        Next →
      </Button>
    </div>
  );
}
