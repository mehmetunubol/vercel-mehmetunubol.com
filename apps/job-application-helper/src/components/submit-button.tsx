"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@repo/ui";

export function SubmitButton({
  children,
  pendingText,
  ...props
}: ButtonProps & { pendingText?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} aria-busy={pending} {...props}>
      {pending ? (pendingText ?? "Working…") : children}
    </Button>
  );
}
