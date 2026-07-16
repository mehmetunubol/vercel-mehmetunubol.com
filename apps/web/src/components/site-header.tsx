"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Header, ScrollProgress, ThemeToggle, cn } from "@repo/ui";
import { site } from "@/lib/site";

export function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [activeSection, setActiveSection] = useState<string>("");

  useEffect(() => {
    if (!isHome) return;

    const ids = site.nav
      .filter((item) => item.href.startsWith("#"))
      .map((item) => item.href.replace("#", ""));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        }
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 },
    );

    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [isHome]);

  return (
    <>
      <ScrollProgress className="print:hidden" />
      <Header
        className="print:hidden"
        brand={
          <Link href="/" className="group flex items-center gap-2 font-mono text-sm">
            <span className="grid h-6 w-6 place-items-center rounded bg-accent text-xs font-bold text-accent-foreground transition-transform group-hover:-rotate-6">
              M
            </span>
            <span className="font-semibold tracking-tight">unubol</span>
            <span className="text-accent">_</span>
          </Link>
        }
        nav={site.nav.map((item, index) => {
          const isAnchor = item.href.startsWith("#");
          // Anchor links only resolve on the homepage; elsewhere, route back to "/" first.
          const href = isAnchor ? (isHome ? item.href : `/${item.href}`) : item.href;
          const isActive = isAnchor
            ? isHome && activeSection === item.href.replace("#", "")
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono text-xs transition-colors sm:px-3",
                isActive ? "text-accent" : "text-muted hover:text-foreground",
              )}
            >
              <span className={cn("text-[0.65rem]", isActive ? "text-accent" : "text-muted/60")}>
                {String(index + 1).padStart(2, "0")}
              </span>
              {item.label}
            </Link>
          );
        })}
        actions={<ThemeToggle />}
      />
    </>
  );
}
