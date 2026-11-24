import { test } from "@playwright/test";
import {
  BASE,
  LOCKED,
  MISMATCH,
  api,
  attempt,
  closeAllWindows,
  ok,
  openGate,
  signIn,
} from "./helpers";

// Lockout alerts to the admin, and the panic buttons.
// Runs after the earlier suites, against the data they created.

test.afterEach(({ browser }) => closeAllWindows(browser));

test("security: lockout alerts and panic buttons", async ({ browser }) => {
  const admin = await signIn(browser, "user", "admin-pass-123", "dark");

  // 1. Lockout after 5 wrong passwords, and the alert reaches the admin.
  const gate = await openGate(browser, "light");
  for (let i = 1; i <= 4; i++) {
    const r = await attempt(gate, "burak", "wrong-" + i);
    ok(r.includes(MISMATCH), `wrong password ${i}: "don't match"`);
  }
  const fifth = await attempt(gate, "burak", "wrong-5");
  ok(fifth.includes(LOCKED), "5th wrong password: locked message");
  const correctWhileLocked = await attempt(gate, "burak", "burak-new-1");
  ok(correctWhileLocked.includes(LOCKED), "correct password while locked: still locked");

  await admin.waitForSelector("text=An account was locked after failed sign-in attempts", {
    timeout: 15000,
  });
  ok(
    await admin.isVisible('[aria-label="1 security alerts"]'),
    "admin sees home banner and Admin tab badge",
  );
  await admin.click("text=Review");
  await admin.waitForSelector("text=still locked");
  ok(await admin.isVisible("text=Burak Kaya"), "Security section names the locked account");
  await admin.click('button:has-text("Unlock now")');
  await admin.waitForSelector("text=still locked", { state: "detached", timeout: 15000 });
  ok(
    (await attempt(gate, "burak", "burak-new-1")) === "ok",
    'after "Unlock now" the user can sign in',
  );
  await admin.click('button:has-text("Mark 1 as seen")');
  await admin.waitForSelector('[aria-label="1 security alerts"]', {
    state: "detached",
    timeout: 15000,
  });
  ok(true, "mark as seen clears the badge");

  // 2. Panic: delete all messages; an open chat empties by itself.
  const ayse = await signIn(browser, "ayse", "ayse-pass-2", "light");
  await ayse.click('a[href^="/c/"]:has-text("Mehmet Ünübol")');
  await ayse.waitForSelector("text=Yes, until 6. Come by!");
  await admin.goto(BASE + "/admin");
  await admin.click('button:has-text("Delete all messages now")');
  await admin.waitForSelector("text=/Deleted \\d+ messages/");
  ok(true, "purge reports how many messages were deleted");
  await ayse.waitForSelector("text=Yes, until 6. Come by!", { state: "detached", timeout: 20000 });
  ok(true, "an open chat on someone else's phone empties by itself");
  const left = await ayse.evaluate(
    async () =>
      (
        await (
          await fetch(location.pathname.replace("/c/", "/api/conversations/") + "/messages")
        ).json()
      ).messages.length,
  );
  ok(left === 0, "server has no messages left");

  // 3. Panic: disable sign-ins.
  await admin.click('button:has-text("Disable all sign-ins")');
  await admin.waitForSelector("text=Sign-ins disabled. Everyone else has been signed out.");
  const st = await ayse.evaluate(async () => (await fetch("/api/state")).status).catch(() => 401);
  ok(st === 401, "signed-in users are signed out immediately");
  const g2 = await openGate(browser, "light");
  ok(
    (await attempt(g2, "ayse", "ayse-pass-2")).includes(LOCKED),
    'correct password shows the ordinary "locked" message',
  );
  ok(
    (await attempt(g2, "nobody", "whatever-1")).includes(LOCKED),
    "unknown username gets the same message",
  );
  const admin2 = await signIn(browser, "user", "admin-pass-123", "dark");
  ok(true, "admin can still sign in");
  await admin2.waitForSelector("text=Sign-ins are disabled for everyone but you.");
  ok(true, "admin home reminds that sign-ins are disabled");
  await admin2.goto(BASE + "/admin");
  await admin2.click('button:has-text("Enable sign-ins again")');
  await admin2.waitForSelector("text=Sign-ins enabled again.");
  ok((await attempt(g2, "ayse", "ayse-pass-2")) === "ok", "after re-enabling, users can sign in");

  // Delete all events, and the activity log.
  await api(admin2, "POST", "/api/events", {
    title: "Panic test",
    startsAt: new Date(Date.now() + 864e5).toISOString(),
    durationMinutes: 30,
    inviteeIds: [],
  });
  await admin2.goto(BASE + "/admin");
  await admin2.click('button:has-text("Delete all events now")');
  await admin2.waitForSelector("text=/Deleted \\d+ events?\\./");
  ok(
    (await api(admin2, "GET", "/api/events")).body.events.length === 0,
    "Delete all events removes every event",
  );
  await admin2.reload();
  const activity = await admin2
    .locator("section", { has: admin2.locator("h2", { hasText: /^Activity$/ }) })
    .innerText();
  for (const line of [
    "Added Ayşe Demir (@ayse)",
    "Unlocked Burak Kaya (@burak)",
    "Deleted all messages",
    "Disabled sign-ins and signed everyone else out",
    "Enabled sign-ins again",
    "Deleted all events",
  ]) {
    ok(activity.includes(line), `activity log records: ${line}`);
  }
});
