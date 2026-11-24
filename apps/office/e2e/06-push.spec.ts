import { test } from "@playwright/test";
import {
  BASE,
  FAKE_PUSH,
  clearPushLog,
  closeAllWindows,
  goAway,
  ok,
  pushLog,
  resetOnline,
  send,
  signIn,
  sleep,
  sql,
  tapSecret,
  userIds,
  waitFor,
} from "./helpers";

// Push nudges: who gets them, rate limit, no payload, and what the phone shows.
// Runs after the earlier suites, against the data they created.

test.afterEach(({ browser }) => closeAllWindows(browser));

test("push: content-free nudges", async ({ browser }) => {
  await resetOnline();
  // A fake device for each user, pointing at the fake push service.
  for (const u of ["user", "ayse", "burak"]) {
    await sql(
      "insert into push_subscriptions (user_id, endpoint, p256dh, auth) select id, $1, 'BPlaceholderKey', 'placeholder' from users where username = $2",
      [`${FAKE_PUSH}/${u}`, u],
    );
  }
  await clearPushLog();
  const ayse = await signIn(browser, "ayse", "ayse-pass-2");
  const burak = await signIn(browser, "burak", "burak-new-1");

  // 1. Private message → only the recipient is nudged, with no content at all.
  await ayse.click('a[href^="/c/"]:has-text("Mehmet Ünübol")');
  await send(ayse, "Push test one");
  ok(
    await waitFor(async () => (await pushLog()).some((e) => e.path === "/user")),
    "recipient of a private message is nudged",
  );
  const log = await pushLog();
  ok(!log.some((e) => e.path === "/ayse"), "the sender is not nudged");
  const e = log.find((x) => x.path === "/user")!;
  ok(e.bytes === 0 && e.encoding === null, "the push carries no payload at all");
  ok(e.vapid && Number(e.ttl) > 0, "push is signed (VAPID) and has a TTL");

  // 2. Throttle: a second message within a minute doesn't nudge again.
  await send(ayse, "Push test two");
  await sleep(2500);
  ok(
    (await pushLog()).filter((x) => x.path === "/user").length === 1,
    "at most one nudge per minute per device",
  );

  // 3. Group message → every other member who isn't using the app right now.
  // Ayşe has the app open, so she sees it there and gets no nudge.
  await clearPushLog();
  await burak.click('a[href^="/c/"]:has-text("Studio")');
  await send(burak, "Group push test");
  ok(
    await waitFor(async () => (await pushLog()).some((x) => x.path === "/user")),
    "group message nudges members who aren't in the app",
  );
  await sleep(1500);
  ok(
    !(await pushLog()).some((x) => x.path === "/ayse"),
    "members using the app right now are not nudged",
  );
  ok(!(await pushLog()).some((x) => x.path === "/burak"), "not the group sender");

  // 4. Event invitation → the invitee (Burak switches to another app first).
  await goAway(burak);
  await clearPushLog();
  const ids = await userIds(ayse);
  const created = await ayse.evaluate(
    async (burakId) =>
      (
        await fetch("/api/events", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title: "Push event",
            startsAt: new Date(Date.now() + 864e5).toISOString(),
            durationMinutes: 30,
            inviteeIds: [burakId],
          }),
        })
      ).status,
    ids.burak,
  );
  ok(created === 200, "event created");
  ok(
    await waitFor(async () => (await pushLog()).some((x) => x.path === "/burak")),
    "event invitation nudges the invitee",
  );
  ok(!(await pushLog()).some((x) => x.path === "/user"), "people not invited are not nudged");

  // 5. Account lockout → the admin.
  await clearPushLog();
  const gate = await (await browser.newContext()).newPage();
  await gate.goto(BASE + "/");
  await tapSecret(gate);
  for (let i = 1; i <= 5; i++) {
    await gate.fill("input[name=username]", "burak");
    await gate.fill("input[name=password]", "nope-" + i);
    await gate.click("button[type=submit]");
    await gate.waitForSelector(i < 5 ? "text=don't match" : "text=This account is locked");
  }
  ok(
    await waitFor(async () => (await pushLog()).some((x) => x.path === "/user")),
    "a lockout nudges the admin",
  );
  await sql("update users set locked_until = null, failed_logins = 0 where username = 'burak'");

  // 6. Expired subscriptions are cleaned up. (Ayşe leaves the app so she's nudged.)
  await goAway(ayse);
  await sql(
    "insert into push_subscriptions (user_id, endpoint, p256dh, auth) select id, $1, 'BPlaceholderKey', 'placeholder' from users where username = 'ayse'",
    [`${FAKE_PUSH}/gone/ayse`],
  );
  await clearPushLog();
  await burak.goto(BASE + "/");
  await burak.click('a[href^="/c/"]:has-text("Studio")');
  await send(burak, "Cleanup test");
  ok(
    await waitFor(
      async () =>
        (
          await sql(
            "select count(*)::int as n from push_subscriptions where endpoint like '%/gone/%'",
          )
        )[0].n === 0,
    ),
    "a subscription the push service rejects (410) is deleted",
  );

  // 7. The service worker shows a generic line for a payload-less push.
  const reg = await ayse.evaluate(async () => {
    const r = await navigator.serviceWorker.ready;
    return r.scope;
  });
  const cdp = await ayse.context().newCDPSession(ayse);
  await cdp.send("ServiceWorker.enable");
  const regId = await new Promise<string>((resolve) => {
    cdp.on("ServiceWorker.workerRegistrationUpdated", (ev) => {
      const r = ev.registrations.find((x) => x.scopeURL === reg);
      if (r) resolve(r.registrationId);
    });
  });
  await ayse.context().grantPermissions(["notifications"], { origin: BASE });
  await cdp.send("ServiceWorker.deliverPushMessage", {
    origin: BASE,
    registrationId: regId,
    data: "",
  });
  await sleep(1000);
  const shown = await ayse.evaluate(async () =>
    (await (await navigator.serviceWorker.ready).getNotifications()).map((n) => ({
      title: n.title,
      body: n.body,
    })),
  );
  ok(shown.length === 1, "service worker shows one notification");
  const shownText = JSON.stringify(shown[0]).toLowerCase();
  ok(
    !/office|message|chat|event|ayse|burak|mehmet|push test/.test(shownText),
    `notification is generic: "${shown[0]!.title}: ${shown[0]!.body}"`,
  );

  // 8. The Account card. Subscribing needs the browser's real push service (Google's,
  // for Chromium), which this sandbox can't reach, so only the card itself is checked.
  await ayse.goto(BASE + "/account");
  await ayse.waitForSelector("text=Turn on for this device");
  ok(
    await ayse.isVisible("text=It never says what the app is"),
    "Account explains that notifications are generic",
  );
  await ayse.click("text=Turn on for this device");
  const outcome = await Promise.race([
    ayse.waitForSelector("text=On for this device", { timeout: 20000 }).then(() => "subscribed"),
    ayse
      .waitForSelector("text=Couldn't turn notifications on", { timeout: 20000 })
      .then(() => "push service unreachable (expected here)"),
  ]).catch(() => "no result");
  console.log("  (info) turning on in this sandbox:", outcome);
});
