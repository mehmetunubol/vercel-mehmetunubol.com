import { headers } from "next/headers";
import { fromAcceptLanguage, type Locale, resolveLocale, translate, type Vars } from "@/lib/i18n";

/** The language for this request: the user's choice, else the browser's. */
export async function requestLocale(userChoice?: string | null): Promise<Locale> {
  const phone = fromAcceptLanguage((await headers()).get("accept-language"));
  return resolveLocale(userChoice, phone);
}

/** Server-side t(): for server components, server actions and API messages. */
export async function serverT(userChoice?: string | null) {
  const locale = await requestLocale(userChoice);
  return (text: string, vars?: Vars) => translate(locale, text, vars);
}
