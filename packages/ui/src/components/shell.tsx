import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../lib/cn";

export interface HeaderProps extends HTMLAttributes<HTMLElement> {
  /** Left-aligned brand slot (name, logo, or home link). Provided by the app. */
  brand?: ReactNode;
  /** Center/left navigation slot. The app supplies its own links. */
  nav?: ReactNode;
  /** Right-aligned actions slot (e.g. theme toggle, CTA). */
  actions?: ReactNode;
}

/**
 * Presentational site header with brand, nav, and actions slots. It never
 * hardcodes links or domains — the consuming app passes navigation as slots.
 */
export function Header({ brand, nav, actions, className, ...props }: HeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur",
        className,
      )}
      {...props}
    >
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-6 px-4 sm:px-6">
        {brand ? <div className="flex items-center font-semibold">{brand}</div> : null}
        {nav ? (
          <nav className="flex items-center gap-1 text-sm" aria-label="Primary">
            {nav}
          </nav>
        ) : null}
        {actions ? <div className="ml-auto flex items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

export interface FooterProps extends HTMLAttributes<HTMLElement> {
  children?: ReactNode;
}

/** Presentational site footer. Content is supplied by the app. */
export function Footer({ children, className, ...props }: FooterProps) {
  return (
    <footer className={cn("w-full border-t border-border", className)} {...props}>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 py-8 text-sm text-muted sm:px-6">
        {children}
      </div>
    </footer>
  );
}

export interface ShellProps extends HTMLAttributes<HTMLDivElement> {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * Full-height page shell: header slot, main content, footer slot. Purely
 * presentational layout — apps compose their own header/footer and pass them in.
 */
export function Shell({ header, footer, children, className, ...props }: ShellProps) {
  return (
    <div
      className={cn(
        "flex min-h-dvh flex-col bg-background font-sans text-foreground antialiased",
        className,
      )}
      {...props}
    >
      {header}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">{children}</main>
      {footer}
    </div>
  );
}
