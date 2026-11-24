"use client";

import { useEffect, useState } from "react";
import { appName } from "@/lib/app-name";
import { clearPlannerData, loadLocal, saveLocal } from "@/lib/planner-storage";
import { useI18n } from "@/components/i18n-provider";

const KEY = "day-planner:settings";

interface Settings {
  dailyReminder: boolean;
  weekStartsMonday: boolean;
  showCompleted: boolean;
  sounds: boolean;
}

const DEFAULTS: Settings = {
  dailyReminder: true,
  weekStartsMonday: true,
  showCompleted: true,
  sounds: false,
};

const ROWS: { key: keyof Settings; label: string; hint: string }[] = [
  {
    key: "dailyReminder",
    label: "Daily reminder",
    hint: "A gentle nudge at 09:00 to check your list",
  },
  { key: "weekStartsMonday", label: "Week starts on Monday", hint: "Used in the week view" },
  {
    key: "showCompleted",
    label: "Show completed tasks",
    hint: "Keep ticked items in today's list",
  },
  { key: "sounds", label: "Sounds", hint: "Play a sound when you tick something off" },
];

export function SettingsPage() {
  const { t, locale } = useI18n();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read from the browser
    setSettings({ ...DEFAULTS, ...loadLocal<Partial<Settings>>(KEY, {}) });
  }, []);

  const current = settings ?? DEFAULTS;
  return (
    <>
      <p className="eyebrow">{appName(locale).name}</p>
      <h1 className="mt-1 text-[2rem] leading-tight font-semibold">{t("Settings")}</h1>
      <section
        className="glass mt-6 divide-y divide-[var(--hairline)] rounded-[1.75rem] px-5"
        aria-label={t("Settings")}
      >
        {ROWS.map((row) => (
          <label key={row.key} className="flex cursor-pointer items-center gap-4 py-4">
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{t(row.label)}</span>
              <span className="block text-sm text-[var(--ink-2)]">{t(row.hint)}</span>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={current[row.key]}
              onChange={(e) => {
                const next = { ...current, [row.key]: e.target.checked };
                setSettings(next);
                saveLocal(KEY, next);
              }}
              className="size-5 accent-[var(--ink)]"
            />
          </label>
        ))}
      </section>
      <section className="glass mt-4 rounded-[1.75rem] p-5">
        <h2 className="font-medium">{t("Your data")}</h2>
        <p className="mt-1 text-sm text-[var(--ink-2)]">
          {t("Your lists and notes are stored on this device only. Nothing is uploaded.")}
        </p>
        <button
          type="button"
          className="btn btn-danger btn-sm mt-3"
          onClick={() => {
            if (!window.confirm(t("Clear all lists, notes and settings on this device?"))) return;
            clearPlannerData();
            setSettings(DEFAULTS);
            setCleared(true);
          }}
        >
          {t("Clear all data")}
        </button>
        {cleared ? <p className="mt-2 text-sm text-[var(--ink-2)]">{t("Cleared.")}</p> : null}
      </section>
      <p className="mt-6 text-center text-xs text-[var(--ink-3)]">{appName(locale).name} 2.4.1</p>
    </>
  );
}
