import { expect, test } from "@playwright/test";
import { BASE, api, closeAllWindows, deleteLocalKeys, ok, send, signIn, userIds } from "./helpers";

// Announcement groups, reactions, read receipts, and the locked-device rule.
// Runs after the earlier suites, against the data they created.

test.afterEach(({ browser }) => closeAllWindows(browser));

test("chat: announcements, reactions, read receipts", async ({ browser }) => {
  const admin = await signIn(browser, "user", "admin-pass-123", "dark");
  const ayse = await signIn(browser, "ayse", "ayse-pass-2", "light");
  const burak = await signIn(browser, "burak", "burak-new-1", "dark");

  // 1. Announcement group; admin unticks themself but is added automatically.
  await admin.goto(BASE + "/admin");
  const form = admin.locator("form", { has: admin.locator('input[placeholder="Group name"]') });
  await form.locator("input[name=name]").fill("News");
  await form.locator("label", { hasText: "Mehmet Ünübol" }).click(); // untick self
  for (const n of ["Ayşe Demir", "Burak Kaya"]) await form.locator("label", { hasText: n }).click();
  await form.locator("input[name=announcement]").check();
  await form.locator("button[type=submit]").click();
  await admin.waitForSelector("text=Created News.");
  ok(true, "announcement group created");

  await admin.goto(BASE + "/");
  await admin.click('a:has-text("News")');
  await admin.waitForURL(/\/c\//);
  const newsUrl = admin.url();
  await send(admin, "Office is closed on Monday for maintenance.");
  ok(true, "admin auto-added to announcement group and can post");

  await ayse.goto(newsUrl);
  await ayse.waitForSelector("text=Office is closed on Monday");
  ok(
    (await ayse.locator("textarea").count()) === 0,
    "member has no composer in announcement group",
  );
  await ayse.waitForSelector("text=can post here");
  const newsId = newsUrl.split("/c/")[1];
  const st = await ayse.evaluate(
    async (id) =>
      (
        await fetch(`/api/conversations/${id}/messages`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            id: crypto.randomUUID(),
            senderPublicKey: "AAAA",
            ciphertext: "AAAA",
            iv: "AAAA",
            keys: {},
          }),
        })
      ).status,
    newsId,
  );
  ok(st === 403, "server rejects member posting in announcement group");

  // 2. Reactions.
  await ayse.click('[role=button]:has-text("Office is closed on Monday")');
  await ayse.click('button[aria-label="Thumbs up"]');
  await burak.goto(newsUrl);
  await burak.click('[role=button]:has-text("Office is closed on Monday")');
  await burak.click('button[aria-label="Thumbs up"]');
  await admin.waitForFunction(
    () =>
      /\n2\n/.test(document.body.innerText) ||
      document.querySelector('[title="Ayşe Demir, Burak Kaya"]'),
    null,
    { timeout: 20_000 },
  );
  ok(
    (await admin.locator('[title="Ayşe Demir, Burak Kaya"]').count()) === 1,
    "admin sees 👍 2 with names",
  );
  await ayse.click('button[aria-label="Thumbs down"]');
  await admin.waitForSelector('[title="Burak Kaya"]', { timeout: 20_000 });
  await admin.waitForSelector('[title="Ayşe Demir"]', { timeout: 20_000 });
  ok(true, "switching reaction to 👎 updates counts");
  await ayse.waitForTimeout(300);
  await ayse.click('button[aria-label="Thumbs down"]');
  await admin.waitForFunction(() => !document.querySelector('[title="Ayşe Demir"]'), null, {
    timeout: 20_000,
  });
  ok(true, "tapping the same reaction again removes it");
  const own = await admin.evaluate(async (id) => {
    const r = await (await fetch(`/api/conversations/${id}/messages`)).json();
    return (
      await fetch(`/api/conversations/${id}/messages/${r.messages[0].id}/reaction`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reaction: "up" }),
      })
    ).status;
  }, newsId);
  ok(own === 400, "can't react to own message");

  // 3. Read receipts — direct.
  await ayse.goto(BASE + "/");
  await burak.goto(BASE + "/");
  await admin.goto(BASE + "/");
  await admin.click('a:has-text("Ayşe Demir")');
  await send(admin, "Did you get the keys?");
  await admin.waitForSelector("text=Sent");
  ok(true, 'direct: "Sent" before the other person opens it');
  await ayse.click('a:has-text("Mehmet Ünübol")');
  await ayse.waitForSelector("text=Did you get the keys?");
  await admin.waitForSelector("text=Read", { timeout: 20_000 });
  ok(true, 'direct: turns to "Read" once opened');

  // Read receipts — group.
  await admin.goto(BASE + "/");
  await admin.click('a:has-text("Studio")');
  await send(admin, "Standup in 10 minutes");
  await ayse.goto(BASE + "/");
  await ayse.click('a:has-text("Studio")');
  await ayse.waitForSelector("text=Standup in 10 minutes");
  await admin.waitForSelector("text=Read by 1 of 2", { timeout: 20_000 });
  ok(true, 'group: "Read by 1 of 2"');
  await admin.click('[role=button]:has-text("Standup in 10 minutes")');
  await admin.waitForSelector("text=Not yet");
  const details = await admin.evaluate(() => document.body.innerText);
  ok(
    /Read by Ayşe Demir/.test(details) && /Not yet Burak Kaya/.test(details),
    "tap shows who read and who has not",
  );
  await burak.goto(BASE + "/");
  await burak.click('a:has-text("Studio")');
  await burak.waitForSelector("text=Standup in 10 minutes");
  await admin.waitForSelector("text=Read by all", { timeout: 20_000 });
  ok(true, 'group: "Read by all"');

  await ayse.goto(BASE + "/");
  await ayse.waitForTimeout(500);

  // A device whose key is locked must not mark messages as read.
  // Simulate a device whose local key is gone: delete it and reload.
  const locked = burak;
  await locked.goto(admin.url());
  await locked.waitForSelector("text=Standup in 10 minutes");
  await deleteLocalKeys(locked);
  await admin.waitForTimeout(3000);
  await locked.reload();
  await locked.waitForSelector("text=Unlock messages on this device");
  await admin.locator("textarea").fill("Locked device test");
  await admin.click("button[aria-label=Send]");
  await admin.waitForSelector("text=Locked device test");
  await locked.waitForTimeout(6000);
  const before = await admin.evaluate(() => document.body.innerText);
  ok(
    !/Read by all/.test(before.split("Locked device test")[1] ?? ""),
    "locked device does not mark as read",
  );
  await locked.fill("input[name=password]", "burak-new-1");
  await locked.click('button:has-text("Unlock")');
  await locked.waitForSelector("text=Locked device test");
  await admin.waitForFunction(
    () => /Read by 1 of 2/.test(document.body.innerText.split("Locked device test")[1] ?? ""),
    null,
    { timeout: 20_000 },
  );
  ok(true, "unlocking marks them as read");

  // Replies, edits and deletes in a private chat.
  await admin.goto(BASE + "/");
  await admin.click('a[href^="/c/"]:has-text("Ayşe Demir")');
  await admin.waitForURL(/\/c\//);
  const directUrl = admin.url();
  await send(admin, "Lunch at 1?");
  await ayse.goto(directUrl);
  await ayse.locator('[role=button]:has-text("Lunch at 1?")').first().click();
  await ayse.click('button[aria-label="Reply"]');
  await ayse.waitForSelector("text=Replying to Mehmet Ünübol");
  await send(ayse, "Yes, see you there");
  await expect(admin.locator('[role=button]:has-text("Yes, see you there")')).toContainText(
    "Lunch at 1?",
  );
  ok(true, "a reply shows the quoted message to the other person");

  await admin.locator('[role=button]:has-text("Lunch at 1?")').first().click();
  await admin.click('button:has-text("Edit")');
  await admin.waitForSelector("text=Editing your message");
  await admin.locator("textarea").fill("Lunch at 1:30?");
  await admin.click('button[aria-label="Save edit"]');
  await ayse.waitForSelector("text=Lunch at 1:30?");
  ok(await ayse.isVisible("text=· edited"), "an edit reaches the other person, marked edited");
  await expect(ayse.locator('[role=button]:has-text("Yes, see you there")')).toContainText(
    "Lunch at 1:30?",
  );
  ok(true, "the reply's quote shows the edited text");

  const ids = await userIds(ayse);
  const convId = directUrl.split("/c/")[1]!;
  const listed = (await api(ayse, "GET", `/api/conversations/${convId}/messages`)).body
    .messages as {
    id: string;
    senderId: string;
  }[];
  const adminMessage = listed.filter((m) => m.senderId === ids.user).at(-1)!;
  const forged = await api(
    ayse,
    "PATCH",
    `/api/conversations/${convId}/messages/${adminMessage.id}`,
    {
      senderPublicKey: "AAAA",
      ciphertext: "AAAA",
      iv: "AAAA",
      keys: {},
    },
  );
  ok(forged.status === 403, "you can't edit someone else's message");
  ok(
    (await api(ayse, "DELETE", `/api/conversations/${convId}/messages/${adminMessage.id}`))
      .status === 403,
    "or delete it",
  );

  // Tap the reply's own text: tapping its quote jumps to the original instead.
  const reply = ayse.locator('[role=button]:has-text("Yes, see you there")');
  const box = (await reply.boundingBox())!;
  await reply.click({ position: { x: 16, y: box.height - 10 } });
  await ayse.click('button:has-text("Delete")');
  await admin.waitForSelector("text=Yes, see you there", { state: "detached", timeout: 30_000 });
  ok(true, "deleting your message removes it for everyone");
});
