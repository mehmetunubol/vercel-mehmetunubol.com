"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, EyeOff, House, SlidersHorizontal, UserRound } from "lucide-react";
import { cn } from "@repo/ui";
import { useApp } from "@/components/app-provider";
import { hideNow } from "@/lib/hide";
import { useI18n } from "@/components/i18n-provider";

export function TabBar({ isAdmin }: { isAdmin: boolean }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const { state } = useApp();
  const pendingInvites = state?.pendingInvites ?? 0;
  const securityAlerts = state?.admin?.securityAlerts ?? 0;
  // The chat screen has its own composer at the bottom.
  if (pathname.startsWith("/c/") || pathname.startsWith("/events/")) return null;

  const tabs = [
    { href: "/", label: t("Today"), icon: House },
    { href: "/events", label: t("Events"), icon: CalendarDays },
    ...(isAdmin ? [{ href: "/admin", label: t("Admin"), icon: SlidersHorizontal }] : []),
    { href: "/account", label: t("Account"), icon: UserRound },
  ];

  return (
    <nav className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4">
      <div className="glass-strong pointer-events-auto flex gap-1 rounded-full p-1.5">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors",
                active
                  ? "bg-[var(--mine)] text-[var(--mine-ink)]"
                  : "text-[var(--ink-2)] hover:text-[var(--ink)]",
              )}
            >
              <span className="relative">
                <Icon size={18} strokeWidth={2} />
                {href === "/admin" && securityAlerts > 0 ? (
                  <span
                    aria-label={t("{n} security alerts", { n: securityAlerts })}
                    className="absolute -top-1.5 -right-2 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--danger)] px-1 text-[10px] leading-none font-bold text-white tabular-nums"
                  >
                    {securityAlerts}
                  </span>
                ) : null}
                {href === "/events" && pendingInvites > 0 ? (
                  <span
                    aria-label={t("{n} unanswered invitations", { n: pendingInvites })}
                    className="absolute -top-1.5 -right-2 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--danger)] px-1 text-[10px] leading-none font-bold text-white tabular-nums"
                  >
                    {pendingInvites}
                  </span>
                ) : null}
              </span>
              <span className={active ? "" : "sr-only sm:not-sr-only"}>{label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={hideNow}
          aria-label={t("Hide now")}
          title={t("Hide now")}
          className="flex items-center rounded-full px-3.5 py-2.5 text-[var(--ink-2)] transition-colors hover:text-[var(--ink)]"
        >
          <EyeOff size={18} strokeWidth={2} />
        </button>
      </div>
    </nav>
  );
}
