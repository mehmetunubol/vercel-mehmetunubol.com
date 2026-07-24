"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CardContent, CardHeader, CardTitle } from "@repo/ui";

export function PostCardMotion({
  href,
  categoryLabel,
  categoryBadgeClass,
  showCategory,
  title,
  excerpt,
  meta,
}: {
  href: string;
  categoryLabel: string;
  categoryBadgeClass: string;
  showCategory: boolean;
  title: string;
  excerpt: string;
  meta: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="h-full"
    >
      <Link href={href} className="block h-full">
        <div className="glass flex h-full flex-col rounded-lg shadow-card transition-shadow duration-300 hover:glow-ring">
          <CardHeader className="flex flex-col gap-2">
            {showCategory ? (
              <span
                className={`w-fit rounded-full px-2.5 py-0.5 text-[0.65rem] font-medium ${categoryBadgeClass}`}
              >
                {categoryLabel}
              </span>
            ) : null}
            <CardTitle className="text-base">{title}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3">
            <p className="text-sm text-muted">{excerpt}</p>
            <p className="mt-auto text-xs text-muted">{meta}</p>
          </CardContent>
        </div>
      </Link>
    </motion.div>
  );
}
