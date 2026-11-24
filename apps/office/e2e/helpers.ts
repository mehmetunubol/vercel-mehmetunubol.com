import { type Browser, devices, expect, type Page } from "@playwright/test";
import pg from "pg";

export const BASE = "http://localhost:3100";
export const FAKE_PUSH_PORT = 4519;
export const FAKE_PUSH_ADMIN_PORT = 4520;
export const FAKE_PUSH = `https://localhost:${FAKE_PUSH_PORT}`;

export const LOCKED = "This account is locked. Try again in 15 minutes.";
export const MISMATCH = "That username and password don't match.";

/** Asserts with a readable label (shows up in the test output on failure). */
export function ok(condition: unknown, label: string) {
  expect(condition, label).toBeTruthy();
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function waitFor(check: () => Promise<boolean> | boolean, ms = 10_000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await check()) return true;
    await sleep(250);
  }
  return false;
}

/** A fresh "phone" with the decoy page open and sign-in revealed. */
export async function openGate(browser: Browser, scheme: "light" | "dark" = "dark") {
  const context = await browser.newContext({
    ...devices["iPhone 13"],
    colorScheme: scheme,
    timezoneId: "Europe/Istanbul",
    baseURL: BASE,
  });
  const page = await context.newPage();
  page.on("dialog", (d) => void d.accept());
  await page.goto("/");
  for (let i = 0; i < 3; i++) await page.click("text=Notice ref. FM-2611");
  await page.waitForSelector("input[name=username]");
  return page;
}

/** Submits the sign-in form; returns "ok" or the error shown. */
export async function attempt(page: Page, username: string, password: string) {
  await page.fill("input[name=username]", username);
  await page.fill("input[name=password]", password);
  await page.click("button[type=submit]");
  return Promise.race([
    page.waitForSelector("text=Your status", { timeout: 30_000 }).then(() => "ok"),
    page
      .waitForSelector("[role=alert]:not(#__next-route-announcer__)", { timeout: 30_000 })
      .then((el) => el.innerText()),
  ]);
}

export async function signIn(
  browser: Browser,
  username: string,
  password: string,
  scheme: "light" | "dark" = "dark",
) {
  const page = await openGate(browser, scheme);
  const result = await attempt(page, username, password);
  if (result !== "ok") throw new Error(`sign-in as ${username} failed: ${result}`);
  return page;
}

/** Types and sends a chat message, waiting until it's saved. */
export async function send(page: Page, text: string) {
  await page.locator("textarea").fill(text);
  await page.click("button[aria-label=Send]");
  await page.waitForFunction(() => !document.body.innerText.includes("Sending…"));
}

export async function api(page: Page, method: string, path: string, body?: unknown) {
  return page.evaluate(
    async ([method, path, body]) => {
      const r = await fetch(path as string, {
        method: method as string,
        headers: { "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { status: r.status, body: await r.json().catch(() => null) };
    },
    [method, path, body] as const,
  );
}

/** username → user id, as seen by the signed-in page. */
export async function userIds(page: Page): Promise<Record<string, string>> {
  return page.evaluate(async () => {
    const state = await (await fetch("/api/state")).json();
    return Object.fromEntries(
      state.people.map((p: { username: string; id: string }) => [p.username, p.id]),
    );
  });
}

export async function sql(query: string, params: unknown[] = []) {
  const client = new pg.Client({ connectionString: process.env.E2E_DATABASE_URL });
  await client.connect();
  try {
    return (await client.query(query, params)).rows;
  } finally {
    await client.end();
  }
}

export async function deleteLocalKeys(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const request = indexedDB.deleteDatabase("office-keys");
        request.onsuccess = request.onerror = request.onblocked = () => resolve();
      }),
  );
}

export interface PushDelivery {
  path: string;
  bytes: number;
  encoding: string | null;
  ttl: string | null;
  vapid: boolean;
}

export async function pushLog(): Promise<PushDelivery[]> {
  return (await fetch(`http://localhost:${FAKE_PUSH_ADMIN_PORT}/`)).json();
}

/** Clears recorded deliveries and the per-device rate limit. */
export async function clearPushLog() {
  await fetch(`http://localhost:${FAKE_PUSH_ADMIN_PORT}/clear`);
  await sql("update push_subscriptions set last_sent_at = null");
}

/** "YYYY-MM-DD" for a day offset from today, in the browser's timezone. */
export async function localDay(page: Page, offsetDays = 0) {
  return page.evaluate((offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, offsetDays);
}
