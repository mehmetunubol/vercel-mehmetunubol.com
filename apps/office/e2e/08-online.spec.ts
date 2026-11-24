import { expect, type Page, test } from "@playwright/test";
import {
  BASE,
  clearPushLog,
  closeAllWindows,
  comeBack,
  goAway,
  ok,
  pushLog,
  resetOnline,
  send,
  signIn,
  sleep,
  waitFor,
} from "./helpers";

// Online status (separate from In / Out of the office), last seen, the
// reciprocal "hide" switch, typing, and no notifications while online.

/** The People-list row for someone (not their chat row). */
const personRow = (page: Page, name: string) =>
  page
    .locator("li", { hasText: name })
    .filter({ hasText: /Since|Not set yet|Back|Leaving/ })
    .first();

test.afterEach(({ browser }) => closeAllWindows(browser));

test("online: status, last seen, privacy, typing, quiet notifications", async ({ browser }) => {
  await resetOnline();
  const admin = await signIn(browser, "user", "admin-pass-123", "dark");
  const ayse = await signIn(browser, "ayse", "ayse-pass-2", "light");

  // Both have the app open.
  await expect(personRow(admin, "Ayşe Demir")).toContainText("Online");
  ok(
    (await personRow(admin, "Ayşe Demir").locator('[data-online="true"]').count()) === 1,
    "the avatar gets the online ring",
  );

  // Ayşe switches to another app: offline within seconds, with an exact last-seen time.
  await goAway(ayse);
  await expect(personRow(admin, "Ayşe Demir")).toContainText(/Last seen \d\d:\d\d/);
  ok(
    (await personRow(admin, "Ayşe Demir").locator('[data-online="true"]').count()) === 0,
    "no ring while away",
  );
  await comeBack(ayse);
  await expect(personRow(admin, "Ayşe Demir")).toContainText("Online");
  ok(true, "coming back shows online again");

  // Chat header and typing.
  await admin.click('a[href^="/c/"]:has-text("Ayşe Demir")');
  await admin.waitForURL(/\/c\//);
  const chatUrl = admin.url();
  await expect(admin.locator("header")).toContainText("Online");
  ok(true, "chat header shows online");
  await ayse.goto(chatUrl);
  await ayse.locator("textarea").fill("Typing something");
  await expect(admin.locator("header")).toContainText("typing…");
  await expect(admin.getByText("Ayşe Demir is typing…")).toBeVisible();
  ok(true, 'the other person sees "typing…"');
  await ayse.click("button[aria-label=Send]");
  await expect(admin.getByText("Ayşe Demir is typing…")).toBeHidden();
  ok(true, "sending clears it");

  // Ayşe hides her online status: neither side sees the other's any more.
  await ayse.goto(BASE + "/account");
  await ayse.uncheck('input[name="showOnline"]');
  await expect(ayse.locator('input[name="showOnline"]')).not.toBeChecked();
  await admin.goto(BASE + "/");
  await expect(personRow(admin, "Ayşe Demir")).not.toContainText(/Online|Last seen/);
  ok(
    (await personRow(admin, "Ayşe Demir").locator('[data-online="true"]').count()) === 0,
    "others no longer see her status",
  );
  await ayse.goto(BASE + "/");
  await expect(personRow(ayse, "Mehmet Ünübol")).toBeVisible();
  await sleep(1000);
  ok(
    !/Online|Last seen/.test(await personRow(ayse, "Mehmet Ünübol").innerText()),
    "and she doesn't see theirs",
  );
  await admin.goto(chatUrl);
  await ayse.goto(chatUrl);
  await ayse.locator("textarea").fill("Quietly typing");
  await sleep(6000);
  ok(!(await admin.getByText("is typing…").isVisible()), "her typing isn't shown either");
  await ayse.locator("textarea").fill("");
  await ayse.goto(BASE + "/account");
  await ayse.check('input[name="showOnline"]');
  await expect(ayse.locator('input[name="showOnline"]')).toBeChecked();

  // No notification while you're in the app; one once you've left.
  await admin.goto(chatUrl);
  await ayse.goto(chatUrl);
  await clearPushLog();
  await send(ayse, "You're online, no buzz");
  await sleep(2500);
  ok(
    !(await pushLog()).some((x) => x.path === "/user"),
    "no notification while the admin is in the app",
  );
  await goAway(admin);
  await clearPushLog();
  await send(ayse, "Now you're away");
  ok(
    await waitFor(async () => (await pushLog()).some((x) => x.path === "/user")),
    "a notification once they've left",
  );
});
