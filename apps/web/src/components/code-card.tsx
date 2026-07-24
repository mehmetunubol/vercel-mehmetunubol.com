"use client";

import { motion } from "framer-motion";
import { site } from "@/lib/site";

export function CodeCard() {
  return (
    <motion.div
      whileHover={{ scale: 1.02, rotate: 0.3 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="glass hover:glow-ring w-full min-w-0 max-w-full overflow-hidden rounded-xl shadow-card transition-shadow duration-300 sm:max-w-md"
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-red-400/80" />
        <span className="h-3 w-3 rounded-full bg-yellow-400/80" />
        <span className="h-3 w-3 rounded-full bg-green-400/80" />
        <span className="ml-2 font-mono text-xs text-muted">developer.ts</span>
      </div>
      <pre className="max-w-full overflow-x-auto p-4 font-mono text-[0.72rem] leading-relaxed sm:p-5 sm:text-[0.8rem]">
        <code className="block whitespace-pre">
          <span className="text-accent">const</span>{" "}
          <span className="text-foreground">engineer</span> = {"{"}
          {"\n"}
          {"  "}name: <span className="text-emerald-400">&quot;{site.name}&quot;</span>,{"\n"}
          {"  "}role: <span className="text-emerald-400">&quot;{site.title}&quot;</span>,{"\n"}
          {"  "}stack: [{"\n"}
          {site.skills.map((skill) => (
            <span key={skill}>
              {"    "}
              <span className="text-emerald-400">&quot;{skill}&quot;</span>,{"\n"}
            </span>
          ))}
          {"  "}],{"\n"}
          {"  "}location: <span className="text-emerald-400">&quot;{site.location}&quot;</span>,
          {"\n"}
          {"  "}available: <span className="text-accent">true</span>,{"\n"}
          {"}"};
          <span className="ml-0.5 inline-block h-4 w-2 translate-y-0.5 animate-pulse bg-accent" />
        </code>
      </pre>
    </motion.div>
  );
}
