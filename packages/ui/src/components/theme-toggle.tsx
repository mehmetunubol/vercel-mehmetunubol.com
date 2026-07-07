"use client";

import { cn } from "../lib/cn";
import { useTheme } from "./theme-provider";

export interface ThemeToggleProps {
  className?: string;
}

/**
 * Presentational light/dark toggle. Requires a surrounding ThemeProvider.
 *
 * The icon is switched via CSS `dark:` variants (not JS state) so the server
 * and client render identical markup — avoiding hydration mismatches.
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const { toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle color theme"
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-md border border-border",
        "text-foreground transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800",
        className,
      )}
    >
      <span aria-hidden className="text-base leading-none dark:hidden">
        {"\u263D"}
      </span>
      <span aria-hidden className="hidden text-base leading-none dark:inline">
        {"\u2600"}
      </span>
    </button>
  );
}
