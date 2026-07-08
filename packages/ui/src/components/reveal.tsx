"use client";

import { useEffect, useRef, useState, type HTMLAttributes } from "react";
import { cn } from "../lib/cn";

export interface RevealProps extends HTMLAttributes<HTMLDivElement> {
  /** Stagger delay before the reveal transition starts, in milliseconds. */
  delayMs?: number;
  /** Reveal once and stop observing (default) or re-animate on every entry. */
  once?: boolean;
}

/**
 * Presentational scroll-reveal wrapper. Fades/translates its children into view
 * when they enter the viewport via IntersectionObserver. Respects
 * `prefers-reduced-motion` through the `motion-reduce` utilities, so the content
 * is always visible for users who opt out of motion.
 */
export function Reveal({ delayMs = 0, once = true, className, style, ...props }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            if (once) observer.disconnect();
          } else if (!once) {
            setVisible(false);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [once]);

  return (
    <div
      ref={ref}
      data-visible={visible}
      style={{ transitionDelay: `${delayMs}ms`, ...style }}
      className={cn(
        "min-w-0 translate-y-6 opacity-0 blur-[3px] transition-[opacity,transform,filter] duration-700 ease-out will-change-transform",
        "data-[visible=true]:translate-y-0 data-[visible=true]:opacity-100 data-[visible=true]:blur-none",
        "motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:blur-none motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  );
}
