"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "../lib/cn";

export interface ScrollProgressProps {
  className?: string;
}

/**
 * Fixed reading-progress bar driven by document scroll. Presentational only —
 * it reads scroll position and paints a scaled bar. Updates are throttled with
 * requestAnimationFrame for smoothness.
 */
export function ScrollProgress({ className }: ScrollProgressProps) {
  const [progress, setProgress] = useState(0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const update = () => {
      frame.current = null;
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setProgress(max > 0 ? el.scrollTop / max : 0);
    };
    const onScroll = () => {
      if (frame.current === null) frame.current = window.requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame.current !== null) window.cancelAnimationFrame(frame.current);
    };
  }, []);

  return (
    <div
      aria-hidden
      className={cn("fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-accent", className)}
      style={{ transform: `scaleX(${progress})` }}
    />
  );
}
