/**
 * "Live session" markers. Signing in sets both; closing the browser, tab or
 * installed app clears them, which ends the session:
 *  - LIVE_COOKIE has no expiry, so the browser drops it when it closes. The
 *    server treats a session without it as signed out.
 *  - LIVE_STORAGE_KEY lives in sessionStorage, which is cleared when the tab
 *    or the installed app is closed (including mobile PWAs, and desktop
 *    browsers that restore cookies after a restart). The app signs out when
 *    it's missing.
 */
export const LIVE_COOKIE = "office_live";
export const LIVE_STORAGE_KEY = "office-live";

export function markSessionLive() {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${LIVE_COOKIE}=1; Path=/; SameSite=Strict${secure}`;
  try {
    sessionStorage.setItem(LIVE_STORAGE_KEY, "1");
  } catch {
    // Storage unavailable (private mode); the cookie still guards the session.
  }
}

export function clearSessionLive() {
  document.cookie = `${LIVE_COOKIE}=; Path=/; Max-Age=0; SameSite=Strict`;
  try {
    sessionStorage.removeItem(LIVE_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function isSessionLive() {
  try {
    return sessionStorage.getItem(LIVE_STORAGE_KEY) === "1";
  } catch {
    return document.cookie.split("; ").some((c) => c === `${LIVE_COOKIE}=1`);
  }
}
