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
 *
 * On small screens the nav becomes a second, horizontally scrollable row so
 * long link lists never push the page wider than the viewport.
 */
export function Header({ brand, nav, actions, className, ...props }: HeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full min-w-0 border-b border-border bg-background/80 backdrop-blur",
        className,
      )}
      {...props}
    >
      <div className="mx-auto flex w-full min-w-0 max-w-5xl flex-col px-4 sm:h-16 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
        <div className="flex h-14 min-w-0 items-center gap-3 sm:h-auto sm:shrink-0">
          {brand ? <div className="min-w-0 font-semibold">{brand}</div> : null}
          {actions ? <div className="ml-auto flex shrink-0 items-center gap-2 sm:hidden">{actions}</div> : null}
        </div>

        {nav ? (
          <nav
            className="-mx-4 flex min-w-0 items-center gap-1 overflow-x-auto overscroll-x-contain px-4 pb-3 [scrollbar-width:none] sm:mx-0 sm:flex-1 sm:overflow-x-auto sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden"
            aria-label="Primary"
          >
            {nav}
          </nav>
        ) : null}

        {actions ? (
          <div className="ml-auto hidden shrink-0 items-center gap-2 sm:flex">{actions}</div>
        ) : null}
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
    <footer className={cn("w-full min-w-0 border-t border-border", className)} {...props}>
      <div className="mx-auto flex w-full min-w-0 max-w-5xl flex-col gap-2 px-4 py-8 text-sm text-muted sm:px-6">
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
        "flex min-h-dvh w-full min-w-0 flex-col overflow-x-clip bg-background font-sans text-foreground antialiased",
        className,
      )}
      {...props}
    >
      {header}
      <main className="mx-auto w-full min-w-0 max-w-5xl flex-1 px-4 py-10 sm:px-6">{children}</main>
      {footer}
    </div>
  );
}
