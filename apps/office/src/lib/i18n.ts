import { TR } from "@/lib/i18n-tr";

/**
 * Interface language. Texts are written in English in the code and looked up
 * in the Turkish dictionary (`lib/i18n-tr.ts`) when the language is Turkish;
 * a missing entry falls back to English. `{name}` placeholders are filled from
 * `vars`. A unit test checks that every text used with t() has a translation.
 */
export type Locale = "en" | "tr";
export const LOCALES: Locale[] = ["en", "tr"];

export type Vars = Record<string, string | number>;

export function translate(locale: Locale, text: string, vars?: Vars) {
  const template = locale === "tr" ? (TR[text] ?? text) : text;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

/** Locale for Intl date formatting. */
export function dateLocale(locale: Locale) {
  return locale === "tr" ? "tr-TR" : "en-GB";
}

/** "tr" for Turkish phones/browsers, English otherwise. */
export function fromLanguageTag(tag: string | null | undefined): Locale {
  return tag?.toLowerCase().startsWith("tr") ? "tr" : "en";
}

/** From an Accept-Language header: the first language listed. */
export function fromAcceptLanguage(header: string | null | undefined): Locale {
  return fromLanguageTag(header?.split(",")[0]?.trim());
}

/** A person's own choice wins; otherwise the phone's language. */
export function resolveLocale(userChoice: string | null | undefined, phone: Locale): Locale {
  return userChoice === "tr" || userChoice === "en" ? userChoice : phone;
}
