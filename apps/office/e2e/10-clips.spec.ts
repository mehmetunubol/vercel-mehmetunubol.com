import { expect, type Page, test } from "@playwright/test";
import { BASE, TEST_PNG, api, closeAllWindows, ok, signIn, sql } from "./helpers";

// One-time voice notes and videos (up to 5 s), recorded in the app with
// Chromium's fake microphone and camera. Runs after the earlier suites.

test.afterEach(({ browser }) => closeAllWindows(browser));

async function record(page: Page, kind: "Voice note" | "Video", switchCamera = false) {
  await page.click('button[aria-label="Attach"]');
  await page.getByRole("menuitem", { name: new RegExp(`^${kind}`) }).click();
  const recorder = page.getByRole("dialog", {
    name: kind === "Voice note" ? "Record a voice note" : "Record a video",
  });
  if (switchCamera) {
    const preview = recorder.locator("video");
    await expect(preview).toHaveClass(/scaleX\(-1\)/);
    await recorder.getByRole("button", { name: "Switch to the back camera" }).click();
    await expect(
      recorder.getByRole("button", { name: "Switch to the front camera" }),
    ).toBeVisible();
    ok(
      !/scaleX\(-1\)/.test((await preview.getAttribute("class")) ?? ""),
      "the back camera isn't mirrored",
    );
    const facing = await preview.evaluate(
      (el: HTMLVideoElement) =>
        (el.srcObject as MediaStream).getVideoTracks()[0]!.getConstraints().facingMode,
    );
    ok(facing === "environment", "switching asks for the back camera");
  }
  await recorder.getByRole("button", { name: "Record", exact: true }).click();
  await expect(recorder.getByText(/Recording/)).toBeVisible();
  await page.waitForTimeout(1500);
  await recorder.getByRole("button", { name: "Stop" }).click();
  await expect(recorder.getByText(/Recorded \d\.\d s/)).toBeVisible();
  await recorder.getByRole("button", { name: "Send" }).click();
  await expect(recorder).toBeHidden();
  await page.waitForFunction(() => !document.body.innerText.includes("Sending…"));
}

/** Opens the newest one-time item, holds it for a moment, releases and closes. */
async function playOnce(page: Page, tapLabel: string, mediaSelector: "audio" | "video") {
  await page.locator("button", { hasText: tapLabel }).last().click();
  const viewer = page.locator('[role=dialog][aria-label^="One-time"]');
  await expect(viewer).toBeVisible();
  await expect(viewer.getByText(/Press and hold/)).toBeVisible();
  const box = (await viewer.boundingBox())!;
  await page.mouse.move(box.width / 2, box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(700);
  const playing = await viewer
    .locator(mediaSelector)
    .evaluate((el: HTMLMediaElement) => !el.paused && el.currentTime > 0);
  ok(playing, `holding plays the ${mediaSelector === "audio" ? "voice note" : "video"}`);
  await page.mouse.up();
  ok(
    await viewer.locator(mediaSelector).evaluate((el: HTMLMediaElement) => el.paused),
    "releasing pauses it",
  );
  await viewer.locator('button[aria-label="Close"]').click();
  await expect(viewer).toBeHidden();
}

test("clips: one-time voice notes and videos", async ({ browser }) => {
  const ayse = await signIn(browser, "ayse", "ayse-pass-2", "light");
  const admin = await signIn(browser, "user", "admin-pass-123", "dark");

  await ayse.click('a[href^="/c/"]:has-text("Mehmet Ünübol")');
  await ayse.waitForURL(/\/c\//);
  const chatUrl = ayse.url();
  const chatId = chatUrl.split("/c/")[1]!;

  // Voice note.
  await record(ayse, "Voice note");
  await expect(ayse.getByText("Not opened yet").last()).toBeVisible();
  const photos = (await api(ayse, "GET", `/api/conversations/${chatId}/messages`)).body.photos as {
    id: string;
    kind: string;
  }[];
  const voice = photos.filter((p) => p.kind === "once").at(-1)!;
  const stored = (await sql("select size from attachments where id = $1", [voice.id]))[0];
  ok(stored.size > 500, "the recording was stored (encrypted)");
  ok(
    (await api(ayse, "GET", `/api/photos/${voice.id}`)).status === 403,
    "the sender can't play it back",
  );

  await admin.goto(chatUrl);
  await expect(admin.getByText(/Voice note · \d s/).last()).toBeVisible();
  await playOnce(admin, "Tap to listen once", "audio");
  ok(
    (await api(admin, "GET", `/api/photos/${voice.id}`)).status === 410,
    "a voice note plays only once",
  );

  // Video.
  // Phones have two cameras; Chromium's fake device is one, so report a second.
  await ayse.evaluate(() => {
    const list = navigator.mediaDevices.enumerateDevices.bind(navigator.mediaDevices);
    navigator.mediaDevices.enumerateDevices = async () => {
      const devices = await list();
      const camera = devices.find((d) => d.kind === "videoinput");
      return camera ? [...devices, camera] : devices;
    };
  });
  await record(ayse, "Video", true);
  await admin.waitForSelector("text=Video · view once");
  await playOnce(admin, "Tap to view once", "video");
  await expect(ayse.getByText(/^Opened$/).last()).toBeVisible({ timeout: 15_000 });
  ok(true, "the sender sees it was opened");

  // One-time photos now allow 5 seconds.
  await ayse.setInputFiles('input[aria-label="Choose a photo"]', {
    name: "p.png",
    mimeType: "image/png",
    buffer: TEST_PNG,
  });
  await ayse.click("button[aria-label=Send]");
  await admin.locator("button", { hasText: "Tap to view once" }).last().click();
  await expect(admin.getByText(/5 s left/)).toBeVisible();
  ok(true, "one-time photos can be viewed for 5 seconds");
  await admin.locator('[role=dialog] button[aria-label="Close"]').click();
  await admin.goto(BASE + "/");
});
