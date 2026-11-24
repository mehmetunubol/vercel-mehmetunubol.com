"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { dateLocale, type Locale, translate, type Vars } from "@/lib/i18n";

const I18nContext = createContext<Locale>("en");

/** Provides the language chosen on the server, so first paint already matches. */
export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <I18nContext.Provider value={locale}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const locale = useContext(I18nContext);
  const t = useCallback((text: string, vars?: Vars) => translate(locale, text, vars), [locale]);
  return useMemo(() => ({ locale, t, dateLocale: dateLocale(locale) }), [locale, t]);
}
