"use client";

import { useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useCanRenderWebgl } from "@/hooks/use-can-render-webgl";
// Swap between "@/components/background-scene" (node network) and
// "@/components/wireframe-scene" (morphing wireframe solid) to compare —
// both export the same `BackgroundScene`/`FORMATIONS`/`Formation` shape.
import { FORMATIONS, type Formation } from "@/components/wireframe-scene";

const BackgroundScene = dynamic(
  () => import("@/components/wireframe-scene").then((mod) => mod.BackgroundScene),
  { ssr: false },
);

/**
 * Gated, page-level wrapper: mounts a single persistent WebGL scene behind
 * the whole site (not per-section) when the environment can handle it, and
 * tracks which section is in view to morph the scene's node formation —
 * same active-section IntersectionObserver pattern as `SiteHeader`.
 *
 * Wraps `children` so content can be given explicit `relative z-10`
 * stacking above the scene's `fixed` canvas (which takes no layout space
 * itself, so no offset compensation is needed either way).
 */
export function SiteBackground({ children }: { children: ReactNode }) {
  const canRender = useCanRenderWebgl();
  const [activeFormation, setActiveFormation] = useState<Formation>("about");

  useEffect(() => {
    if (!canRender) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id as Formation;
            if (FORMATIONS.includes(id)) setActiveFormation(id);
          }
        }
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 },
    );

    for (const id of FORMATIONS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [canRender]);

  return (
    <>
      {canRender ? <BackgroundScene activeFormation={activeFormation} /> : null}
      <div className="relative z-10">{children}</div>
    </>
  );
}
