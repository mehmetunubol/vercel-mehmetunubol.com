"use client";

import { useSyncExternalStore } from "react";
import { clock } from "@/lib/plan";

const noSubscribe = () => () => {};

/** "22 Nov · 14:05" in the viewer's timezone (server-rendered pages would use the server's). */
export function LocalTime({ iso }: { iso: string }) {
  return useSyncExternalStore(
    noSubscribe,
    () => {
      const date = new Date(iso);
      return `${date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · ${clock(date)}`;
    },
    () => "",
  );
}
