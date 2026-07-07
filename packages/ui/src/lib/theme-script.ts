export type Theme = "light" | "dark";

/**
 * Inline script that applies the persisted/default theme before first paint.
 * Render it in the document <head> (e.g. inside a Next.js layout via
 * `<script dangerouslySetInnerHTML={{ __html: themeInitScript() }} />`) to
 * prevent a flash of the wrong theme.
 *
 * When no preference is stored, `defaultTheme` is used (falling through to the
 * OS preference only when `defaultTheme` is "system"). This lives in a
 * server-safe module (no `"use client"`) so it can be called from server
 * components.
 */
export function themeInitScript(
  storageKey = "theme",
  defaultTheme: Theme | "system" = "system",
): string {
  return `(function(){try{var k=${JSON.stringify(storageKey)};var def=${JSON.stringify(defaultTheme)};var s=localStorage.getItem(k);var d;if(s){d=s==='dark';}else if(def==='system'){d=matchMedia('(prefers-color-scheme: dark)').matches;}else{d=def==='dark';}var r=document.documentElement;r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light';}catch(e){}})();`;
}
