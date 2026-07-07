import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "../lib/cn";

export type BadgeVariant = "default" | "accent" | "outline";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variants: Record<BadgeVariant, string> = {
  default: "border-border bg-neutral-100 text-foreground dark:bg-neutral-800",
  accent: "border-accent/30 bg-accent/10 text-accent",
  outline: "border-border text-muted",
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { className, variant = "default", ...props },
  ref,
) {
  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
});
