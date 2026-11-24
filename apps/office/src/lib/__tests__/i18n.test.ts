import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { fromAcceptLanguage, resolveLocale, translate } from "@/lib/i18n";
import { TR } from "@/lib/i18n-tr";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return name === "__tests__" ? [] : sourceFiles(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

describe("i18n", () => {
  it("translates, fills placeholders, and falls back to English", () => {
    expect(translate("en", "Hi, {name}", { name: "Ayşe" })).toBe("Hi, Ayşe");
    expect(translate("tr", "No such text {x}", { x: 1 })).toBe("No such text 1");
  });

  it("picks the language from the user's choice, else the phone", () => {
    expect(fromAcceptLanguage("tr-TR,tr;q=0.9,en;q=0.8")).toBe("tr");
    expect(fromAcceptLanguage("en-US,en;q=0.9")).toBe("en");
    expect(resolveLocale(null, "tr")).toBe("tr");
    expect(resolveLocale("en", "tr")).toBe("en");
  });

  it("has a Turkish translation for every text the app uses", () => {
    const root = path.resolve(__dirname, "..", "..");
    const missing = new Set<string>();
    // t("…"), t('…') and t(`…`) without ${} inside.
    const pattern = /\bt\(\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`([^`$]*)`)/g;
    for (const file of sourceFiles(root)) {
      for (const match of readFileSync(file, "utf8").matchAll(pattern)) {
        const raw = match[1] ?? match[2] ?? match[3] ?? "";
        const text = raw.replace(/\\(["'\\])/g, "$1");
        if (!(text in TR)) missing.add(`${path.relative(root, file)}: ${text}`);
      }
    }
    expect([...missing]).toEqual([]);
  });

  it("translates texts that reach t() through a variable", () => {
    const indirect = [
      // Labels kept in arrays.
      "In…",
      "Today at",
      "Pick a day",
      "Morning",
      "Afternoon",
      "Evening",
      "Exact time",
      "Default",
      "1 hour",
      "8 hours",
      "1 day",
      "1 week",
      "Always",
      "Going",
      "Maybe",
      "Can't go",
      "No reply",
      "Automatic",
      "Gym, 19:00",
      "Farmers' market",
      "Daily reminder",
      "Keep ticked items in today's list",
      // Errors from shared code and the server.
      "Pick a time.",
      "Pick a time within 60 days.",
      "Wrong password.",
      "Could not load your keys.",
      "Couldn't prepare encryption keys.",
      "Couldn't unlock.",
      "Ordinary photos are turned off. Send it as a one-time photo.",
      "Title is too long (80 max).",
      "New password must be at least 8 characters.",
      // Admin action results.
      "Added {name}.",
      "Deleted {n} messages.",
      "“{username}” already exists.",
      "Delete ALL messages in every chat? This can't be undone.",
      "Password must be at least 8 characters.",
      "Sign-ins enabled again.",
    ];
    expect(indirect.filter((text) => !(text in TR))).toEqual([]);
  });
});
