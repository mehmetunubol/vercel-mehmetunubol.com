import { expect, test } from "@playwright/test";
import {
  BASE,
  DECOY,
  LOCKED,
  attempt,
  clearPushLog,
  closeAllWindows,
  goAway,
  ok,
  openGate,
  pushLog,
  resetOnline,
  send,
  signIn,
  sleep,
  sql,
  waitFor,
} from "./helpers";

// Guessing limit per network address, quick hide, auto-lock, per-chat message
// lifetime, and muting. Runs after the earlier suites.

test.afterEach(({ browser }) => closeAllWindows(browser));

test("controls: guessing limit, hide, auto-lock, chat lifetime, mute", async ({ browser }) => {
  await resetOnline();

  // 1. Too many failures from one network address block it, whatever the username.
  const attacker = { "x-forwarded-for": "203.0.113.9", "x-real-ip": "203.0.113.9" };
  const gate = await openGate(browser, "light", attacker);
  // Made-up usernames: real ones would also trip their own 5-attempt lockout.
  const names = ["guest", "test", "office", "manager"];
  for (let i = 0; i < 20; i++) {
    const result = await attempt(gate, names[i % names.length]!, `wrong-guess-${i}`);
    ok(result !== "ok", `guess ${i + 1} fails`);
  }
  ok(
    (await attempt(gate, "ayse", "ayse-pass-2")).includes(LOCKED),
    "after 20 failures even the right password is refused",
  );
  const elsewhere = await signIn(browser, "ayse", "ayse-pass-2", "light");
  ok(true, "the same person can still sign in from another network");
  await elsewhere.context().close();

  const admin = await signIn(browser, "user", "admin-pass-123", "dark");
  await admin.goto(BASE + "/admin");
  await expect(admin.getByText("203.0.113.9")).toBeVisible();
  ok(true, "the admin sees which address was blocked");
  await admin
    .locator("li", { hasText: "203.0.113.9" })
    .locator('button:has-text("Unblock")')
    .click();
  await admin.waitForSelector("text=Unblocked.");
  ok(
    (await attempt(gate, "ayse", "ayse-pass-2")) === "ok",
    "after Unblock the address can sign in again",
  );
  await gate.context().close();

  // 2. Quick hide: the eye button, and Esc twice on a computer.
  const ayse = await signIn(browser, "ayse", "ayse-pass-2", "light");
  await ayse.click('button[aria-label="Hide now"]');
  await ayse.waitForSelector(DECOY);
  ok(
    (await ayse.evaluate(async () => (await fetch("/api/state")).status)) === 401,
    "Hide now signs out at once",
  );
  const ayse2 = await signIn(browser, "ayse", "ayse-pass-2", "light");
  await ayse2.keyboard.press("Escape");
  await ayse2.keyboard.press("Escape");
  await ayse2.waitForSelector(DECOY);
  ok(true, "Esc twice hides the app");

  // 3. Auto-lock after the chosen idle time (the clock is fast-forwarded).
  const idle = await signIn(browser, "ayse", "ayse-pass-2", "light");
  await idle.goto(BASE + "/account");
  await idle
    .getByRole("group", { name: "Auto-lock after" })
    .getByRole("button", { name: "1 min", exact: true })
    .click();
  await expect(
    idle.getByRole("group", { name: "Auto-lock after" }).getByRole("button", { name: "1 min", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
// Reload so the app starts with the 1-minute setting, then let it settle
  // before fast-forwarding the clock.
  await idle.reload();
  await idle.waitForResponse((r) => r.url().includes("/api/state") && r.ok());
  await sleep(1500);
  await idle.clock.install();
  await idle.clock.fastForward("02:00");
  await idle.waitForSelector(DECOY, { timeout: 20_000 });
  ok(true, "the app locks itself after the idle time");
  await idle.context().close();
  const reset = await signIn(browser, "ayse", "ayse-pass-2", "light");
  await reset.goto(BASE + "/account");
  await reset
    .getByRole("group", { name: "Auto-lock after" })
    .getByRole("button", { name: "5 min", exact: true })
    .click();
  await expect(
    reset.getByRole("group", { name: "Auto-lock after" }).getByRole("button", { name: "5 min", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await reset.context().close();

  // 4. Per-chat message lifetime.
  const a = await signIn(browser, "ayse", "ayse-pass-2", "light");
  await a.click('a[href^="/c/"]:has-text("Mehmet Ünübol")');
  await a.waitForURL(/\/c\//);
  const directUrl = a.url();
  const directId = directUrl.split("/c/")[1]!;
  await a.click('button[aria-label="Chat details"]');
  await a
    .getByRole("group", { name: "Message lifetime" })
    .getByRole("button", { name: "1 hour" })
    .click();
  await expect(
    a.getByRole("group", { name: "Message lifetime" }).getByRole("button", { name: "1 hour" }),
  ).toHaveAttribute("aria-pressed", "true");
  await a.click('button[aria-label="Close details"]');
  await expect(a.getByText(/disappears after 1 hour/)).toBeVisible();
  await send(a, "This one lasts an hour");
  const [row] = await sql(
    "select extract(epoch from expires_at - created_at)::int as secs from messages where conversation_id = $1 order by created_at desc limit 1",
    [directId],
  );
  ok(row.secs === 3600, "a private chat's own lifetime applies to new messages");

  await admin.goto(BASE + "/");
  await admin.click('a[href^="/c/"]:has-text("Studio")');
  await admin.waitForURL(/\/c\//);
  const studioUrl = admin.url();
  await admin.click('button[aria-label="Chat details"]');
  await admin
    .getByRole("group", { name: "Message lifetime" })
    .getByRole("button", { name: "8 hours" })
    .click();
  await expect(
    admin.getByRole("group", { name: "Message lifetime" }).getByRole("button", { name: "8 hours" }),
  ).toHaveAttribute("aria-pressed", "true");
  await admin.click('button[aria-label="Close details"]');
  const burak = await signIn(browser, "burak", "burak-new-1", "dark");
  await burak.goto(studioUrl);
  await burak.click('button[aria-label="Chat details"]');
  await expect(burak.getByText("Only the admin can change this for a group.")).toBeVisible();
  ok(
    await burak
      .getByRole("group", { name: "Message lifetime" })
      .getByRole("button", { name: "1 hour" })
      .isDisabled(),
    "group members can't change a group's lifetime",
  );
  const forced = await burak.evaluate(
    async (id) =>
      (
        await fetch(`/api/conversations/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ttlHours: 1 }),
        })
      ).status,
    studioUrl.split("/c/")[1]!,
  );
  ok(forced === 403, "and the server refuses it");
  await admin.goto(BASE + "/admin");
  await expect(admin.getByText('Set messages in "Studio" to 8 hours')).toBeVisible();
  ok(true, "the admin's change is in the activity log");

  // 5. Mute: no notifications from a muted chat.
  await a.goto(directUrl);
  await a.click('button[aria-label="Chat details"]');
  await a.getByRole("group", { name: "Mute" }).getByRole("button", { name: "Always" }).click();
  await expect(a.getByRole("button", { name: "Unmute" })).toBeVisible();
  await a.click('button[aria-label="Close details"]');
  await a.goto(BASE + "/");
  await expect(
    a.locator('a[href^="/c/"]', { hasText: "Mehmet Ünübol" }).getByLabel("Muted"),
  ).toBeVisible();
  ok(true, "muted chats are marked in the list");
  await goAway(a);
  await admin.goto(directUrl);
  await clearPushLog();
  await send(admin, "Muted chat message");
  await sleep(2500);
  ok(!(await pushLog()).some((x) => x.path === "/ayse"), "a muted chat sends no notification");

  const a2 = await signIn(browser, "ayse", "ayse-pass-2", "light");
  await a2.goto(directUrl);
  await a2.click('button[aria-label="Chat details"]');
  await a2.getByRole("button", { name: "Unmute" }).click();
  await expect(a2.getByRole("group", { name: "Mute" })).toBeVisible();
  await goAway(a2);
  await clearPushLog();
  await send(admin, "Unmuted chat message");
  ok(
    await waitFor(async () => (await pushLog()).some((x) => x.path === "/ayse")),
    "after unmuting, notifications come again",
  );
});
