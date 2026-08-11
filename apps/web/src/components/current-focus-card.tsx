"use client";

import { motion } from "framer-motion";
import { site } from "@/lib/site";

const FOCUS_TECH_LIMIT = 6;

export function CurrentFocusCard() {
  const current = site.experience[0];
  const shipped = site.projects.find((project) => project.href?.startsWith("http"));

  if (!current) return null;

  return (
    <motion.div
      whileHover={{ scale: 1.02, rotate: 0.3 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="w-full min-w-0 max-w-full rounded-xl border border-border bg-surface p-5 shadow-card sm:max-w-md sm:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-xs uppercase tracking-widest text-accent">Currently</span>
        <span className="font-mono text-xs text-muted">{current.period}</span>
      </div>

      <div className="mt-3 flex flex-col gap-1">
        <span className="font-medium">
          {current.role} · {current.company}
        </span>
        {current.summary ? (
          <p className="text-sm leading-relaxed text-muted">{current.summary}</p>
        ) : null}
      </div>

      {current.tech ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {current.tech.slice(0, FOCUS_TECH_LIMIT).map((tech) => (
            <span
              key={tech}
              className="rounded-md border border-border px-2 py-0.5 font-mono text-[0.7rem] text-muted"
            >
              {tech}
            </span>
          ))}
        </div>
      ) : null}

      {shipped ? (
        <div className="mt-5 border-t border-border pt-4">
          <span className="font-mono text-xs uppercase tracking-widest text-accent-2">
            Recently shipped
          </span>
          <a
            href={shipped.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-2 flex items-center justify-between gap-2 text-sm transition-colors hover:text-accent-2"
          >
            <span>{shipped.name}</span>
            <span
              aria-hidden
              className="font-mono transition-transform group-hover:translate-x-0.5"
            >
              ↗
            </span>
          </a>
        </div>
      ) : null}
    </motion.div>
  );
}
