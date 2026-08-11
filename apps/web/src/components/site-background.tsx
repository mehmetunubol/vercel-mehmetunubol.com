"use client";

import { useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useCanRenderWebgl } from "@/hooks/use-can-render-webgl";
import type { Formation } from "@/components/wireframe-scene";

const BackgroundScene = dynamic(
  () => import("@/components/wireframe-scene").then((mod) => mod.BackgroundScene),
  { ssr: false },
);

/**
 * Gated, page-level wrapper: mounts a single persistent WebGL scene behind
 * the whole site (not per-section) when the environment can handle it, and
 * tracks which of `sectionIds` is in view to morph the scene's formation —
 * same active-section IntersectionObserver pattern as `SiteHeader`. Each id
 * must match a real element's `id` attribute somewhere in `children`.
 *
 * Wraps `children` so content can be given explicit `relative z-10`
 * stacking above the scene's `fixed` canvas (which takes no layout space
 * itself, so no offset compensation is needed either way).
 */
export function SiteBackground({
  sectionIds,
  children,
}: {
  sectionIds: readonly string[];
  children: ReactNode;
}) {
  const canRender = useCanRenderWebgl();
  const [activeFormation, setActiveFormation] = useState<Formation>(sectionIds[0] ?? "default");

  useEffect(() => {
    if (!canRender) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveFormation(entry.target.id);
          }
        }
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 },
    );

    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [canRender, sectionIds]);

  return (
    <>
      {canRender ? <BackgroundScene activeFormation={activeFormation} /> : null}
      <div className="relative z-10">{children}</div>
    </>
  );
}
