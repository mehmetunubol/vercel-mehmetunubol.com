import { type Browser, devices, test } from "@playwright/test";
import { BASE, deleteLocalKeys, ok, signIn } from "./helpers";

// Sign-in gate, people, private and group chats, sessions, keys and passwords.
// Later suites build on the users and chats created here.

async function login(
  browser: Browser,
  username: string,
  password: string,
  scheme: "light" | "dark" = "dark",
) {
  const page = await signIn(browser, username, password, scheme);
  return { ctx: page.context(), page };
}

test("core: gate, people, chats, sessions and passwords", async ({ browser }) => {
  // bad password
  {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await p.goto(BASE + "/login");
    await p.waitForSelector("text=This office is closed for renovation");
    ok(!(await p.isVisible("input[name=username]")), "/login shows only the decoy");
    await p.click("text=Notice ref. FM-2611");
    await p.click("text=Notice ref. FM-2611");
    await p.waitForTimeout(300);
    ok(!(await p.isVisible("input[name=username]")), "two taps do not open sign-in");
    await p.waitForTimeout(1000);
    await p.click("text=Notice ref. FM-2611");
    ok(!(await p.isVisible("input[name=username]")), "slow taps do not open sign-in");
    await p.waitForTimeout(1000);
    for (let i = 0; i < 3; i++) await p.click("text=Notice ref. FM-2611");
    await p.waitForSelector("input[name=username]");
    ok(true, "three quick taps open sign-in");
    await p.fill("input[name=username]", "user");
    await p.fill("input[name=password]", "nope-nope");
    await p.click("button[type=submit]");
    await p.waitForSelector("text=don't match");
    ok(true, "wrong password rejected");
    await ctx.close();
  }

  const admin = await login(browser, "user", "admin-pass-123", "dark");

  // admin: create users
  await admin.page.goto(BASE + "/admin");
  const newPeople: [string, string, string][] = [
    ["Ayşe Demir", "ayse", "ayse-pass-1"],
    ["Burak Kaya", "burak", "burak-pass-1"],
  ];
  for (const [dn, un, pw] of newPeople) {
    const form = admin.page.locator("form", { has: admin.page.locator("input[name=username]") });
    await form.locator("input[name=displayName]").fill(dn);
    await form.locator("input[name=username]").fill(un);
    await form.locator("input[name=password]").fill(pw);
    await form.locator("button[type=submit]").click();
    await admin.page.waitForSelector(`text=Added ${dn}.`);
  }
  ok(true, "admin created two users");

  // group
  const newGroup = admin.page.locator("form", {
    has: admin.page.locator('input[placeholder="Group name"]'),
  });
  await newGroup.locator("input[name=name]").fill("Studio");
  for (const n of ["Ayşe Demir", "Burak Kaya"])
    await newGroup.locator("label", { hasText: n }).click();
  await newGroup.locator("button[type=submit]").click();
  await admin.page.waitForSelector("text=Created Studio.");
  ok(true, "admin created group");

  const ayse = await login(browser, "ayse", "ayse-pass-1", "light");
  const burak = await login(browser, "burak", "burak-pass-1", "dark");

  // presence
  await admin.page.goto(BASE + "/");
  await admin.page.click('.presence-switch button:has-text("In")');
  await admin.page.waitForSelector("text=In the office");
  await ayse.page.waitForSelector("text=is in the office", { timeout: 10000 });
  ok(true, "ayse sees admin's presence (in) via status bar");

  // non-admin can't access admin
  await burak.page.goto(BASE + "/admin");
  await burak.page.waitForURL(BASE + "/", { timeout: 10000 });
  ok(
    !(await burak.page.content()).includes("People &amp; groups"),
    "non-admin redirected away from /admin",
  );
  const r = await burak.page.evaluate(
    async () =>
      (
        await fetch("/api/conversations/direct", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ userId: "x" }),
        })
      ).status,
  );
  ok(r === 400, "bad direct-chat request rejected");

  // ayse -> admin direct chat
  await ayse.page.click('button:has-text("Mehmet Ünübol")');
  await ayse.page.waitForURL(/\/c\//);
  const directUrl = ayse.page.url();
  const ta = ayse.page.locator("textarea");
  await ta.fill("Merhaba! Are you at the office today?");
  await ayse.page.click("button[aria-label=Send]");
  await ayse.page.waitForSelector("text=Merhaba! Are you at the office today?");
  await ayse.page.waitForFunction(() => !document.body.innerText.includes("Sending…"));
  ok(true, "ayse sent direct message");

  // admin sees unread & reads it
  await admin.page.goto(BASE + "/");
  await admin.page.waitForSelector('a[href^="/c/"]:has-text("Ayşe Demir")', { timeout: 10000 });
  await admin.page.goto(directUrl);
  await admin.page.waitForSelector("text=Merhaba! Are you at the office today?", {
    timeout: 10000,
  });
  ok(true, "admin decrypted direct message");
  await admin.page.locator("textarea").fill("Yes, until 6. Come by!");
  await admin.page.click("button[aria-label=Send]");
  await ayse.page.waitForSelector("text=Yes, until 6. Come by!", { timeout: 10000 });
  ok(true, "ayse received reply via polling");

  // burak cannot read the ayse<->admin chat
  const id = directUrl.split("/c/")[1];
  const s1 = await burak.page.evaluate(
    async (id) => (await fetch(`/api/conversations/${id}/messages`)).status,
    id,
  );
  ok(s1 === 404, "outsider gets 404 on private chat messages");

  // group
  await burak.page.goto(BASE + "/");
  await burak.page.click('a:has-text("Studio")');
  await burak.page.locator("textarea").fill("Group hello from Burak");
  await burak.page.click("button[aria-label=Send]");
  await burak.page.waitForFunction(() => !document.body.innerText.includes("Sending…"));
  await ayse.page.goto(BASE + "/");
  await ayse.page.click('a:has-text("Studio")');
  await ayse.page.waitForSelector("text=Group hello from Burak", { timeout: 10000 });
  ok(true, "group message decrypted by another member");

  // Closing and reopening: a fresh window with the old cookies but no tab session is signed out.
  const reopenedCtx = await browser.newContext({ ...devices["iPhone 13"], colorScheme: "light" });
  await reopenedCtx.addCookies(await ayse.ctx.cookies());
  const reopened = await reopenedCtx.newPage();
  await reopened.goto(directUrl);
  await reopened.waitForSelector("text=This office is closed for renovation");
  await reopened.waitForFunction(() => location.pathname === "/");
  await reopened.waitForTimeout(500);
  const rs = await reopened.evaluate(async () => (await fetch("/api/state")).status);
  ok(rs === 401, "reopened window shows the decoy and is signed out");
  await reopenedCtx.close();

  // Browser restart drops the session-only cookie: the server treats it as signed out.
  const restartCtx = await browser.newContext();
  await restartCtx.addCookies((await ayse.ctx.cookies()).filter((c) => c.name !== "office_live"));
  const restarted = await restartCtx.newPage();
  const rr = await restarted.request.get(BASE + "/api/state");
  ok(rr.status() === 401, "without the session cookie the API refuses");
  await restarted.goto(BASE + "/admin");
  await restarted.waitForSelector("text=This office is closed for renovation");
  ok(!(await restarted.content()).includes("People &amp; groups"), "no app content in decoy HTML");
  await restartCtx.close();
  const still = await ayse.page.evaluate(async () => (await fetch("/api/state")).status);
  ok(still === 200, "the original window is unaffected");

  // Second device signs in and reads history; then its local key is lost → unlock card.
  const a2 = await login(browser, "ayse", "ayse-pass-1", "light");
  await a2.page.goto(directUrl);
  await a2.page.waitForSelector("text=Yes, until 6. Come by!");
  ok(true, "second device decrypts history after sign-in");
  await deleteLocalKeys(a2.page);
  await a2.page.reload();
  await a2.page.waitForSelector("text=Unlock messages on this device");
  await a2.page.fill("input[name=password]", "wrong-password");
  await a2.page.click('button:has-text("Unlock")');
  await a2.page.waitForSelector("text=Wrong password.");
  await a2.page.fill("input[name=password]", "ayse-pass-1");
  await a2.page.click('button:has-text("Unlock")');
  await a2.page.waitForSelector("text=Yes, until 6. Come by!");
  ok(true, "unlock after losing the local key works, wrong password rejected");

  // ayse changes password; old devices signed out; history remains readable
  await ayse.page.goto(BASE + "/account");
  await ayse.page.fill("input[name=current]", "ayse-pass-1");
  await ayse.page.fill("input[name=next]", "ayse-pass-2");
  await ayse.page.fill("input[name=confirm]", "ayse-pass-2");
  await ayse.page.click('button:has-text("Change password")');
  await ayse.page.waitForSelector("text=Password changed");
  const st = await a2.page
    .evaluate(async () => (await fetch("/api/state")).status)
    .catch(() => 401);
  ok(st === 401, "other device signed out after password change");
  const st2 = await ayse.page.evaluate(async () => (await fetch("/api/state")).status);
  ok(st2 === 200, "current device stays signed in after password change");
  await ayse.ctx.close();
  const ayse3 = await login(browser, "ayse", "ayse-pass-2", "light");
  await ayse3.page.goto(directUrl);
  await ayse3.page.waitForSelector("text=Merhaba! Are you at the office today?");
  ok(true, "history readable after password change on fresh login");

  // admin reset burak's password → signed out
  await admin.page.goto(BASE + "/admin");
  const row = admin.page.locator("details", { hasText: "@burak" });
  await row.locator("summary").click();
  await row.locator("input[name=password]").fill("burak-new-1");
  await row.locator('button:has-text("Reset password")').click();
  await admin.page.waitForSelector("text=Password reset");
  // The app itself may already be redirecting Burak to /login, which also means signed out.
  const sb = await burak.page
    .evaluate(async () => (await fetch("/api/state")).status)
    .catch(() => 401);
  ok(sb === 401, "burak signed out after admin reset");

  // TTL setting
  await admin.page.fill("input[name=ttlHours]", "48");
  await admin.page
    .locator("form", { has: admin.page.locator("input[name=ttlHours]") })
    .locator("button")
    .click();
  await admin.page.waitForSelector("text=Applies to new messages");
  ok(true, "ttl saved");
});
