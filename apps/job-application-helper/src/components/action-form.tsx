"use client";

import { useActionState } from "react";
import { type ButtonSize, type ButtonVariant } from "@repo/ui";
import { SubmitButton } from "@/components/submit-button";

export type ActionResult = { ok: true } | { ok: false; message: string };

export function ActionForm({
  action,
  hiddenFields = {},
  submitLabel,
  pendingText,
  variant,
  size,
  children,
  className,
}: {
  action: (prevState: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  hiddenFields?: Record<string, string>;
  submitLabel: string;
  pendingText?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  children?: React.ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, null);

  return (
    <form action={formAction} className={className ?? "inline-flex flex-col items-start gap-1.5"}>
      {Object.entries(hiddenFields).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      {children}
      <SubmitButton size={size} variant={variant} pendingText={pendingText}>
        {submitLabel}
      </SubmitButton>
      {state && !state.ok ? (
        <p className="text-xs text-red-500" role="alert">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
