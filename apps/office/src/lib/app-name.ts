import type { Locale } from "@/lib/i18n";

/** The cover name, as shown on home screens, tabs and notification headers. */
export function appName(locale: Locale) {
  return locale === "tr"
    ? {
        name: "Günlük Planlayıcı",
        short: "Günlük Plan",
        description: "Gününüz için basit bir liste.",
      }
    : { name: "Day Planner", short: "Day Planner", description: "A simple list for your day." };
}
