import { test } from "@playwright/test";
import { BASE, api, closeAllWindows, localDay, ok, signIn, userIds } from "./helpers";

// Events: creating, inviting, answers, calendar, privacy, editing and cancelling.
// Runs after the earlier suites, against the data they created.

interface EventJson {
  id: string;
  title: string;
  startsAt: string;
  invites: { userId: string; response: string }[];
}

test.afterEach(({ browser }) => closeAllWindows(browser));

test("events: create, invite, answer, edit, cancel", async ({ browser }) => {
  const ayse = await signIn(browser, "ayse", "ayse-pass-2", "light");
  const admin = await signIn(browser, "user", "admin-pass-123", "dark");
  const burak = await signIn(browser, "burak", "burak-new-1", "dark");
  const people = await userIds(ayse);

  // Create via the form.
  await ayse.click('a[href="/events"]');
  await ayse.waitForSelector("text=No upcoming events");
  await ayse.click("text=New event");
  await ayse.waitForSelector("text=Plan something");
  await ayse.fill('input[placeholder^="Team lunch"]', "Team lunch");
  const day = await localDay(ayse, 1);
  await ayse.fill("input[type=date]", day);
  await ayse.fill("input[type=time]", "12:30");
  await ayse.click('.chip:has-text("1 h 30 min")');
  await ayse.fill("textarea[aria-label=Description]", "Kebab place on the corner. Booking for 4.");
  await ayse.click('.chip:has-text("Mehmet Ünübol")');
  await ayse.click('.chip:has-text("Burak Kaya")');
  await ayse.waitForSelector("text=12:30–14:00");
  await ayse.click('button:has-text("Create event")');
  await ayse.waitForURL(BASE + "/events");
  await ayse.waitForSelector("text=Team lunch");
  ok(true, "event created with invitees");

  // Invitee sees badge, Up next, and answers.
  await admin.goto(BASE + "/");
  await admin.waitForSelector('[aria-label="1 unanswered invitations"]', { timeout: 15000 });
  await admin.waitForSelector("text=Up next");
  ok(await admin.isVisible("text=Reply"), 'invitee sees badge and "Up next" with Reply');
  await admin.click('a[href="/events"] >> nth=0');
  await admin.waitForSelector("text=Invitation");
  await admin.click('[aria-label="Your answer"] button:has-text("Going")');
  await admin.waitForSelector('[aria-label="1 unanswered invitations"]', {
    state: "detached",
    timeout: 15000,
  });
  ok(true, "answering clears the badge");
  await burak.goto(BASE + "/events");
  await burak.click('[aria-label="Your answer"] button:has-text("Maybe")');
  await ayse.reload();
  await ayse.waitForSelector("text=2 going · 1 maybe", { timeout: 15000 });
  ok(true, 'creator sees "2 going · 1 maybe"');
  await ayse.click('h3:has-text("Team lunch")');
  const detail = await ayse.evaluate(() => document.body.innerText);
  ok(
    /Mehmet Ünübol\s*Going/.test(detail) && /Burak Kaya\s*Maybe/.test(detail),
    "expanded card lists each answer",
  );

  // Calendar filtering.
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  // Same label the calendar gives each day button.
  const dayLabel = (date: Date) =>
    date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  await admin.click(`[aria-label="${dayLabel(new Date(y, m - 1, d))}"]`);
  await admin.waitForSelector("text=Showing Tomorrow");
  ok(await admin.isVisible("text=Team lunch"), "tapping a day shows its events");
  const other = new Date(y, m - 1, d + 2);
  if (other.getMonth() !== m - 1) await admin.click('[aria-label="Next month"]');
  await admin.click(`[aria-label="${dayLabel(other)}"]`);
  await admin.waitForSelector("text=Nothing planned that day.");
  ok(true, "empty day says so");
  await admin.click("text=Show all upcoming");
  await admin.waitForTimeout(400);

  // Privacy and permissions.
  const list = await api(ayse, "GET", "/api/events");
  const lunch = list.body.events.find((e: EventJson) => e.title === "Team lunch");
  const secret = await api(ayse, "POST", "/api/events", {
    title: "Private 1:1",
    startsAt: new Date(Date.now() + 864e5).toISOString(),
    durationMinutes: 30,
    inviteeIds: [people.user],
  });
  ok(secret.status === 200, "second event created via API");
  const burakList = await api(burak, "GET", "/api/events");
  ok(
    !burakList.body.events.some((e: EventJson) => e.title === "Private 1:1"),
    "uninvited people can't see an event",
  );
  ok(
    (
      await api(burak, "PATCH", `/api/events/${lunch.id}`, {
        title: "Hijack",
        startsAt: lunch.startsAt,
        durationMinutes: 60,
        inviteeIds: [],
      })
    ).status === 403,
    "only the creator can edit",
  );
  ok(
    (await api(burak, "DELETE", `/api/events/${lunch.id}`)).status === 403,
    "only the creator can cancel",
  );
  ok(
    (await api(burak, "PUT", `/api/events/${secret.body.id}/response`, { response: "going" }))
      .status === 404,
    "can't answer an event you're not invited to",
  );

  // Validation.
  const past = await api(ayse, "POST", "/api/events", {
    title: "Too late",
    startsAt: new Date(Date.now() - 3600e3).toISOString(),
    durationMinutes: 30,
    inviteeIds: [],
  });
  ok(past.status === 400 && /passed/.test(past.body.error), "past start rejected");
  ok(
    (
      await api(ayse, "POST", "/api/events", {
        title: "x",
        startsAt: new Date(Date.now() + 3600e3).toISOString(),
        durationMinutes: 2,
        inviteeIds: [],
      })
    ).status === 400,
    "too-short duration rejected",
  );
  ok(
    (
      await api(ayse, "POST", "/api/events", {
        title: "  ",
        startsAt: new Date(Date.now() + 3600e3).toISOString(),
        durationMinutes: 30,
        inviteeIds: [],
      })
    ).status === 400,
    "blank title rejected",
  );

  // Editing: move the time and remove Burak.
  await ayse.goto(BASE + "/events");
  await ayse.click(`article:has-text("Team lunch") [aria-label="Edit event"]`);
  await ayse.waitForSelector("text=Edit event");
  await ayse.fill("input[type=time]", "13:00");
  await ayse.click('.chip:has-text("Other")');
  await ayse.fill('input[aria-label="Duration in minutes"]', "25");
  await ayse.click('.chip:has-text("Burak Kaya")');
  await ayse.click('button:has-text("Save changes")');
  await ayse.waitForURL(BASE + "/events");
  await ayse.waitForSelector("text=13:00–13:25");
  ok(await ayse.isVisible("text=25 min"), "edited time and custom duration shown");
  const after = (await api(admin, "GET", "/api/events")).body.events.find(
    (e: EventJson) => e.id === lunch.id,
  );
  ok(
    after.invites.find((i: EventJson["invites"][number]) => i.userId === people.user).response ===
      "pending",
    "changing the time resets answers",
  );
  ok(
    !(await api(burak, "GET", "/api/events")).body.events.some((e: EventJson) => e.id === lunch.id),
    "removed invitee no longer sees it",
  );

  // Cancel.
  await ayse.click(`article:has-text("Team lunch") [aria-label="Edit event"]`);
  await ayse.click('button:has-text("Cancel event")');
  await ayse.waitForURL(BASE + "/events");
  await ayse.waitForSelector("text=Private 1:1");
  ok(
    !(await api(admin, "GET", "/api/events")).body.events.some((e: EventJson) => e.id === lunch.id),
    "cancelled event is gone for everyone",
  );
});
