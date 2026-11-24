import { expect, test } from "@playwright/test";
import { BASE, DECOY, closeAllWindows, ok, signIn } from "./helpers";

// The Day Planner decoy's extra pages, and the admin Health panel.

test.afterEach(({ browser }) => closeAllWindows(browser));

test("planner pages and health panel", async ({ browser }) => {
  // The decoy is a fuller planner: Week, Notes and Settings, all device-only.
  const context = await browser.newContext();
  const page = await context.newPage();
  const apiCalls: string[] = [];
  page.on("request", (r) => {
    if (new URL(r.url()).pathname.startsWith("/api/")) apiCalls.push(r.url());
  });
  await page.goto(BASE + "/");
  await page.waitForSelector(DECOY);
  await page.getByRole("button", { name: "Week" }).click();
  await expect(page.getByRole("region", { name: "This week" }).locator("li").first()).toBeVisible();
  ok(
    (await page.getByRole("region", { name: "This week" }).locator(":scope > ul > li").count()) ===
      7,
    "Week shows 7 days",
  );
  await page.getByRole("button", { name: "Notes" }).click();
  await page.fill('textarea[aria-label="Write a note"]', "Buy a birthday card");
  await page.click('button[aria-label="Save note"]');
  await page.reload();
  await page.getByRole("button", { name: "Notes" }).click();
  await expect(page.getByText("Buy a birthday card")).toBeVisible();
  ok(true, "notes are kept on the device");
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByText("Day Planner 2.4.1")).toBeVisible();
  await page.getByRole("switch", { name: /Sounds/ }).check();
  await page.reload();
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByRole("switch", { name: /Sounds/ })).toBeChecked();
  ok(true, "settings are kept on the device");
  ok((await page.locator("h1").innerText()) === "Settings", "the secret date only exists on Today");
  ok(apiCalls.length === 0, "the planner pages send nothing to the server");
  await context.close();

  // Health panel for the admin.
  const admin = await signIn(browser, "user", "admin-pass-123", "dark");
  await admin.goto(BASE + "/admin");
  const health = admin.locator("section", { has: admin.locator("h2", { hasText: /^Health$/ }) });
  await expect(health).toContainText("Database storage");
  await expect(health.getByRole("meter", { name: "Database storage used" })).toBeVisible();
  const text = await health.innerText();
  ok(/of 512\.0 MB \(free plan\)/.test(text), "storage is shown against the free plan");
  ok(/People\s*3/.test(text), "counts people");
  ok(
    /Online now\s*\d/.test(text) && /Photos & clips stored/.test(text),
    "shows online count and stored media",
  );
});
