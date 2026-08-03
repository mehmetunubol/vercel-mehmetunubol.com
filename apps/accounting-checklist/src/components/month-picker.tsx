"use client";

import { useRef } from "react";

function shiftMonth(monthKey: string, delta: number): string {
  const parts = monthKey.split("-").map(Number);
  const year = parts[0] ?? new Date().getFullYear();
  const month = parts[1] ?? 1;
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(monthKey: string): string {
  const parts = monthKey.split("-").map(Number);
  const year = parts[0] ?? new Date().getFullYear();
  const month = parts[1] ?? 1;
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d={direction === "left" ? "M12 15l-5-5 5-5" : "M8 15l5-5-5-5"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MonthPicker({
  month,
  onChange,
}: {
  month: string;
  onChange: (month: string) => void;
}) {
  const monthInputRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    const input = monthInputRef.current;
    if (!input) return;
    if ("showPicker" in input && typeof input.showPicker === "function") {
      input.showPicker();
    } else {
      input.focus();
    }
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-neutral-500/5 p-1">
      <button
        type="button"
        onClick={() => onChange(shiftMonth(month, -1))}
        aria-label="Previous month"
        className="grid h-8 w-8 cursor-pointer place-items-center rounded-md text-muted transition-colors duration-150 hover:bg-neutral-500/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <ChevronIcon direction="left" />
      </button>
      <div className="relative">
        <button
          type="button"
          onClick={openPicker}
          aria-label="Jump to month"
          className="min-w-[9ch] cursor-pointer rounded-md px-2 py-1 text-center text-sm font-medium tabular-nums transition-colors duration-150 hover:bg-neutral-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          {formatMonthLabel(month)}
        </button>
        <input
          ref={monthInputRef}
          type="month"
          value={month}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          aria-hidden="true"
          tabIndex={-1}
          className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        />
      </div>
      <button
        type="button"
        onClick={() => onChange(shiftMonth(month, 1))}
        aria-label="Next month"
        className="grid h-8 w-8 cursor-pointer place-items-center rounded-md text-muted transition-colors duration-150 hover:bg-neutral-500/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <ChevronIcon direction="right" />
      </button>
    </div>
  );
}
