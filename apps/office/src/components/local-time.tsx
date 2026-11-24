"use client";

import { useSyncExternalStore } from "react";
import { clock } from "@/lib/plan";
import { useI18n } from "@/components/i18n-provider";

const noSubscribe = () => () => {};

/** "22 Nov · 14:05" in the viewer's timezone (server-rendered pages would use the server's). */
export function LocalTime({ iso }: { iso: string }) {
  const { dateLocale } = useI18n();
  return useSyncExternalStore(
    noSubscribe,
    () => {
      const date = new Date(iso);
      return `${date.toLocaleDateString(dateLocale, { day: "numeric", month: "short" })} · ${clock(date)}`;
    },
    () => "",
  );
}
