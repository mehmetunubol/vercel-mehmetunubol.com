import { expect, type Page, test } from "@playwright/test";
import { BASE, TEST_PNG, api, closeAllWindows, ok, signIn, sql, waitFor } from "./helpers";

// One-time and ordinary photos. Runs after the earlier suites.

// A small PNG; the app re-encodes it as JPEG (dropping metadata) before encrypting.
const PNG = TEST_PNG;

async function pickPhoto(page: Page) {
  await page.setInputFiles('input[aria-label="Choose a photo"]', {
    name: "photo.png",
    mimeType: "image/png",
    buffer: PNG,
  });
  await page.waitForSelector('button[aria-label="Remove photo"]');
}

async function photosIn(page: Page, conversationId: string) {
  const res = await api(page, "GET", `/api/conversations/${conversationId}/messages`);
  return res.body.photos as {
    id: string;
    messageId: string;
    kind: string;
    available: boolean;
    viewers: string[];
  }[];
}

/** Opens the one-time viewer, holds to show the photo, releases, and closes it. */
async function viewOnce(page: Page, closeBy: "button" | "leaving" = "button") {
  await page.locator("button", { hasText: "Tap to view once" }).last().click();
  await page.waitForSelector("text=Press and hold to view");
  const viewer = page.locator('[role=dialog][aria-label="One-time photo"]');
  const box = (await viewer.boundingBox())!;
  await page.mouse.move(box.width / 2, box.height / 2);
  await page.mouse.down();
  await expect(viewer.locator("canvas")).toBeVisible();
  const width = await viewer.locator("canvas").evaluate((c: HTMLCanvasElement) => c.width);
  ok(width > 1, "holding shows the photo");
  await page.mouse.up();
  await expect(viewer.locator("canvas")).toBeHidden();
  ok(true, "releasing hides it");
  if (closeBy === "leaving") {
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  } else {
    await viewer.locator('button[aria-label="Close"]').click();
  }
  await expect(viewer).toBeHidden();
}

test.afterEach(({ browser }) => closeAllWindows(browser));

test("photos: one-time and ordinary", async ({ browser }) => {
  const admin = await signIn(browser, "user", "admin-pass-123", "dark");
  const ayse = await signIn(browser, "ayse", "ayse-pass-2", "light");
  const burak = await signIn(browser, "burak", "burak-new-1", "dark");

  // One-time photo in a private chat.
  await ayse.click('a[href^="/c/"]:has-text("Mehmet Ünübol")');
  await ayse.waitForURL(/\/c\//);
  const directId = ayse.url().split("/c/")[1]!;
  await pickPhoto(ayse);
  ok(
    !(await ayse.isVisible("text=Keep in chat")),
    "ordinary photos are off by default: only View once is offered",
  );
  await ayse.locator("textarea").fill("Top secret");
  await ayse.click("button[aria-label=Send]");
  await ayse.waitForSelector("text=Not opened yet");

  const [once] = (await photosIn(ayse, directId)).filter((p) => p.kind === "once");
  ok(once && once.available, "the photo was stored");
  const stored = (await sql("select ciphertext from attachments where id = $1", [once!.id]))[0];
  ok(
    !stored.ciphertext.startsWith("/9j/") && !stored.ciphertext.startsWith("iVBOR"),
    "the server only holds encrypted bytes, not a readable image",
  );
  ok(
    (await api(ayse, "GET", `/api/photos/${once!.id}`)).status === 403,
    "the sender can't open their own one-time photo",
  );

  await admin.goto(`${BASE}/c/${directId}`);
  await admin.waitForSelector("text=Tap to view once");
  ok(await admin.isVisible("text=Top secret"), "the caption is shown");
  await viewOnce(admin);
  await admin.waitForSelector("text=Opened");
  ok(
    (await api(admin, "GET", `/api/photos/${once!.id}`)).status === 410,
    "it can't be opened a second time",
  );
  ok(
    await waitFor(
      async () =>
        (await sql("select ciphertext from attachments where id = $1", [once!.id]))[0]
          .ciphertext === null,
    ),
    "once everyone has opened it, the server erases it",
  );
  await ayse.waitForSelector("text=/^Opened$/", { timeout: 15_000 });
  ok(true, "the sender sees it was opened");

  // One-time photo in a group: each member gets one view.
  await ayse.goto(BASE + "/");
  await ayse.click('a[href^="/c/"]:has-text("Studio")');
  await ayse.waitForURL(/\/c\//);
  const studioId = ayse.url().split("/c/")[1]!;
  await pickPhoto(ayse);
  await ayse.click("button[aria-label=Send]");
  await ayse.waitForSelector("text=Not opened yet");
  const groupPhoto = (await photosIn(ayse, studioId)).filter((p) => p.kind === "once").at(-1)!;

  await admin.goto(`${BASE}/c/${studioId}`);
  await viewOnce(admin);
  ok(
    (await sql("select ciphertext from attachments where id = $1", [groupPhoto.id]))[0]
      .ciphertext !== null,
    "still stored while another member hasn't seen it",
  );
  await burak.goto(`${BASE}/c/${studioId}`);
  await viewOnce(burak, "leaving");
  ok(true, "leaving the app closes the viewer");
  ok(
    await waitFor(
      async () =>
        (await sql("select ciphertext from attachments where id = $1", [groupPhoto.id]))[0]
          .ciphertext === null,
    ),
    "erased after the last member opens it",
  );
  await ayse.waitForSelector("text=Opened by 2", { timeout: 15_000 });
  ok(true, 'the sender sees "Opened by 2"');

  // Ordinary photos are refused while the admin switch is off.
  const refused = await api(ayse, "POST", `/api/conversations/${studioId}/messages`, {
    id: crypto.randomUUID(),
    senderPublicKey: "AAAA",
    ciphertext: "AAAA",
    iv: "AAAA",
    keys: {},
    attachment: { kind: "normal", ciphertext: "AAAA", iv: "AAAA" },
  });
  ok(refused.status === 403, "the server refuses ordinary photos while they're off");

  // The admin turns them on.
  await admin.goto(BASE + "/admin");
  await admin.check('input[name="photosAllowed"]');
  await admin
    .locator("form", { has: admin.locator('input[name="photosAllowed"]') })
    .locator("button")
    .click();
  await admin.waitForSelector("text=Ordinary photos are allowed.");
  ok(true, "admin turned ordinary photos on");

  await ayse.reload();
  await ayse.waitForTimeout(1000);
  await pickPhoto(ayse);
  await ayse.click("text=Keep in chat");
  await ayse.locator("textarea").fill("Whiteboard from today");
  await ayse.click("button[aria-label=Send]");
  await ayse.waitForFunction(() => !document.body.innerText.includes("Sending…"));

  await admin.goto(`${BASE}/c/${studioId}`);
  const img = admin.locator('button[aria-label="Open photo"] img').last();
  await expect(img).toBeVisible();
  ok(
    await img.evaluate((el: HTMLImageElement) => el.naturalWidth > 0),
    "the other side sees the decrypted photo",
  );
  await admin.locator('button[aria-label="Open photo"]').last().click();
  await admin.waitForSelector('[role=dialog][aria-label="Photo"]');
  await admin.locator('[role=dialog][aria-label="Photo"]').click();
  ok(true, "tapping opens it full screen");
  const normal = (await photosIn(admin, studioId)).filter((p) => p.kind === "normal").at(-1)!;
  ok(
    (await api(admin, "GET", `/api/photos/${normal.id}`)).status === 200,
    "ordinary photos can be opened again",
  );

  // Deleting the message removes the photo too.
  const before = Number((await sql("select count(*)::int as n from attachments"))[0].n);
  const listed = (await api(ayse, "GET", `/api/conversations/${studioId}/messages`)).body
    .messages as { id: string }[];
  ok(
    (await api(ayse, "DELETE", `/api/conversations/${studioId}/messages/${normal.messageId}`))
      .status === 200 && listed.some((m) => m.id === normal.messageId),
    "sender deletes the photo message",
  );
  const after = Number((await sql("select count(*)::int as n from attachments"))[0].n);
  ok(after === before - 1, "its photo is deleted with it");
});
