import { devices, expect, test } from "@playwright/test";
import { BASE, closeAllWindows, ok, tapSecret } from "./helpers";

// Turkish interface: a Turkish phone gets the Turkish planner and app name,
// and each person can pin English or Turkish under Account.

test.afterEach(({ browser }) => closeAllWindows(browser));

test("turkish phone, language choice", async ({ browser }) => {
  const context = await browser.newContext({
    ...devices["iPhone 13"],
    locale: "tr-TR",
    timezoneId: "Europe/Istanbul",
    baseURL: BASE,
  });
  const page = await context.newPage();
  page.on("dialog", (d) => void d.accept());

  // The decoy speaks Turkish and carries the Turkish name.
  await page.goto("/");
  await page.waitForSelector("text=Bugünün listesi");
  ok((await page.title()) === "Günlük Planlayıcı", "page title is the Turkish app name");
  ok((await page.getAttribute("html", "lang")) === "tr", "html lang is tr");
  await expect(page.getByText("Çiçekleri sula")).toBeVisible();
  const manifest = await page.evaluate(async () => (await fetch("/manifest.webmanifest")).json());
  ok(manifest.name === "Günlük Planlayıcı", "manifest name follows the phone's language");
  ok(!JSON.stringify(manifest).includes("Office"), "manifest never says Office");
  await page.getByRole("button", { name: "Notlar" }).click();
  await expect(page.getByRole("textbox", { name: "Not yaz" })).toBeVisible();
  await page.getByRole("button", { name: "Bugün" }).click();

  // Sign in: the app follows the phone (Automatic).
  await tapSecret(page);
  await page.fill("input[name=username]", "ayse");
  await page.fill("input[name=password]", "ayse-pass-2");
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await page.waitForSelector("text=Durumun", { timeout: 30_000 });
  ok(true, "signed-in app is in Turkish");
  await expect(page.getByRole("link", { name: "Hesap" })).toBeVisible();

  // Pin English under Account: the whole app switches, despite the Turkish phone.
  await page.getByRole("link", { name: "Hesap" }).click();
  await page.waitForSelector("text=Şifreyi değiştir");
  await page.getByRole("group", { name: "Dil" }).getByRole("button", { name: "English" }).click();
  await page.waitForSelector("text=Change password", { timeout: 20_000 });
  await expect(
    page.getByRole("group", { name: "Language" }).getByRole("button", { name: "English" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("link", { name: "Today" }).click();
  await page.waitForSelector("text=Your status");
  ok(true, "English choice wins over the phone's language");

  // Back to Automatic: Turkish again.
  await page.getByRole("link", { name: "Account" }).click();
  await page
    .getByRole("group", { name: "Language" })
    .getByRole("button", { name: "Automatic" })
    .click();
  await page.waitForSelector("text=Şifreyi değiştir", { timeout: 20_000 });
  ok(true, "Automatic follows the phone again");
  await context.close();
});
