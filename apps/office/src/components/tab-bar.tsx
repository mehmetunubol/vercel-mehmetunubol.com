"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, SlidersHorizontal, UserRound } from "lucide-react";
import { cn } from "@repo/ui";

export function TabBar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  // The chat screen has its own composer at the bottom.
  if (pathname.startsWith("/c/")) return null;

  const tabs = [
    { href: "/", label: "Today", icon: House },
    ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: SlidersHorizontal }] : []),
    { href: "/account", label: "Account", icon: UserRound },
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
              <Icon size={18} strokeWidth={2} />
              <span className={active ? "" : "sr-only sm:not-sr-only"}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
