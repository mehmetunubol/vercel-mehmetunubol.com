import { type Page, test } from "@playwright/test";
import { closeAllWindows, localDay, ok, signIn } from "./helpers";

// Scheduled "back in / leaving at" changes and the In / Out lists.
// Runs after the earlier suites, against the data they created.

const text = (p: Page) => p.evaluate(() => document.body.innerText);

test.afterEach(({ browser }) => closeAllWindows(browser));

test("presence: in/out lists and scheduled status changes", async ({ browser }) => {
  const admin = await signIn(browser, "user", "admin-pass-123", "light");
  const ayse = await signIn(browser, "ayse", "ayse-pass-2", "dark");

  // Admin goes out, then schedules "back in 2 h".
  await admin.click('.presence-switch button:has-text("Out")');
  await admin.waitForSelector("text=Set when you'll be in");
  await admin.click("text=Set when you'll be in");
  await admin.click('[role=tab]:has-text("In…")');
  await admin.click('.chip:has-text("2 h")');
  await admin.waitForSelector("text=Others will see");
  await admin.click('button:has-text("Save")');
  await admin.waitForSelector("text=/Back (in 2 h|tomorrow at \\d\\d:\\d\\d)/");
  ok(true, 'admin scheduled "back in 2 h"');

  await ayse.waitForSelector("text=/is out · back (in 2 h|tomorrow at \\d\\d:\\d\\d)/", {
    timeout: 20_000,
  });
  ok(true, "others see plan in the pinned status bar");
  const t = await text(ayse);
  ok(
    t.search(/Mehmet Ünübol\nBack (in 2 h|tomorrow at \d\d:\d\d)/) > t.indexOf("OUT\n"),
    "admin listed under Out with plan",
  );
  ok(t.includes("IN THE OFFICE\n· 0"), "In list rendered with count");

  // Change to a specific day, morning: three days ahead, so it's named by weekday.
  const target = await localDay(admin, 3);
  const dayName = await admin.evaluate((iso) => {
    const d = new Date(`${iso}T12:00`);
    return `${d.toLocaleDateString("en-GB", { weekday: "short" })} ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
  }, target);
  await admin.click("text=tap to change");
  await admin.click('[role=tab]:has-text("Pick a day")');
  await admin.fill("input[aria-label=Day]", target);
  await admin.click('.chip:has-text("Morning")');
  await admin.waitForSelector(`text=Back ${dayName}, morning`);
  await admin.click('button:has-text("Save")');
  await admin.waitForSelector(`text=${dayName}, 09:00 · tap to change`);
  ok(true, `scheduled "${dayName}, morning" (09:00)`);

  // Past time is rejected in the UI.
  await admin.click("text=tap to change");
  await admin.click('[role=tab]:has-text("Pick a day")');
  await admin.fill(
    "input[aria-label=Day]",
    await admin.evaluate(() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }),
  );
  await admin.click('.chip:has-text("Exact time")');
  await admin.fill("input[aria-label=Time]", "00:01");
  await admin.waitForSelector("text=That time has already passed.");
  ok(await admin.isDisabled('button:has-text("Save")'), "past time blocked");
  await admin.click('button:has-text("Cancel")');

  // Server also rejects a past time.
  const s = await admin.evaluate(
    async () =>
      (
        await fetch("/api/me/presence", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            plan: { at: new Date(Date.now() - 60000).toISOString(), precision: "exact" },
          }),
        })
      ).status,
  );
  ok(s === 400, "server rejects past plan");

  // Ayse goes In and schedules leaving today at 23:30.
  await ayse.click('.presence-switch button:has-text("In")');
  await ayse.click("text=Set when you'll leave");
  await ayse.click('[role=tab]:has-text("Pick a day")');
  await ayse.fill(
    "input[aria-label=Day]",
    await ayse.evaluate(() => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }),
  );
  await ayse.click('.chip:has-text("Exact time")');
  await ayse.fill("input[aria-label=Time]", "23:30");
  await ayse.click('button:has-text("Save")');
  await ayse.waitForSelector("text=Leaving tomorrow at 23:30");
  ok(true, 'ayse scheduled "leaving tomorrow at 23:30"');
  await admin.waitForSelector("text=Leaving tomorrow at 23:30", { timeout: 20_000 });
  ok(true, "admin sees ayse under In with leave time");
  await ayse.waitForTimeout(400);

  // Manual toggle clears the plan.
  await ayse.click('.presence-switch button:has-text("Out")');
  await ayse.waitForSelector("text=Set when you'll be in");
  ok(!(await text(ayse)).includes("Leaving tomorrow at 23:30"), "manual change clears plan");

  // Cancel button clears a plan.
  await admin.click('button[aria-label="Cancel scheduled change"]');
  await admin.waitForSelector("text=Set when you'll be in");
  ok(true, "cancel scheduled change");

  // Auto flip: plan 3 s ahead via API, then wait for the poll.
  await ayse.evaluate(async () =>
    fetch("/api/me/presence", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        plan: { at: new Date(Date.now() + 3000).toISOString(), precision: "exact" },
      }),
    }),
  );
  await admin.waitForFunction(
    () => /IN THE OFFICE\n· 1[\s\S]*Ayşe Demir[\s\S]*OUT/.test(document.body.innerText),
    null,
    { timeout: 15000 },
  );
  ok(true, "scheduled change applied automatically when time arrived");

  // Chat header shows plan.
  await admin.click('.presence-switch button:has-text("In")');
  await admin.click("text=Set when you'll leave");
  await admin.click('[role=tab]:has-text("In…")');
  await admin.click('.chip:has-text("1 h")');
  await admin.click('button:has-text("Save")');
  await ayse.reload();
  await ayse.waitForSelector("text=Your status");
  await ayse.click('a[href^="/c/"]:has-text("Mehmet Ünübol")');
  await ayse.waitForSelector("text=/In the office · leaving (in 1 h|tomorrow at \\d\\d:\\d\\d)/", {
    timeout: 20_000,
  });
  ok(true, "chat header shows plan");
});
