"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@repo/ui";
import type { ActionResult } from "@/app/(app)/admin/actions";
import { useI18n } from "@/components/i18n-provider";

function Submit({
  label,
  pendingLabel,
  className,
}: {
  label: string;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  const { t } = useI18n();
  return (
    <button type="submit" disabled={pending} className={cn("btn", className)}>
      {pending ? (pendingLabel ?? t("Saving…")) : label}
    </button>
  );
}

export function ActionForm({
  action,
  children,
  submitLabel,
  pendingLabel,
  submitClassName = "btn-primary btn-sm",
  className,
  confirm,
  resetOnSuccess,
}: {
  action: (prev: ActionResult | null, form: FormData) => Promise<ActionResult>;
  children?: React.ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  submitClassName?: string;
  className?: string;
  confirm?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const { t } = useI18n();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok && resetOnSuccess) formRef.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className={className}
    >
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <Submit label={submitLabel} pendingLabel={pendingLabel} className={submitClassName} />
        {state ? (
          <p
            role="status"
            className={cn("text-xs", state.ok ? "text-[var(--ink-2)]" : "text-[var(--danger)]")}
          >
            {state.message ? t(state.message, state.vars) : null}
          </p>
        ) : null}
      </div>
    </form>
  );
}
