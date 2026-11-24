// Service worker: makes the app installable and keeps static assets
// fast. API responses and pages are never cached (they're private and live).
const STATIC_CACHE = "static-v4";

// Follows the phone's language (the account setting isn't visible here).
const TURKISH = (self.navigator.language || "").toLowerCase().startsWith("tr");

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const OFFLINE_TEXT = TURKISH
  ? ["Günlük Planlayıcı", "Çevrimdışısınız", "Tekrar bağlandığınızda listeniz burada olacak."]
  : ["Day Planner", "You're offline", "Your list will be here when you're back online."];

const OFFLINE_HTML = `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${OFFLINE_TEXT[0]}</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;
font:16px -apple-system,system-ui,sans-serif;background:#121315;color:#f2eee6">
<div style="text-align:center;padding:24px"><p style="font-weight:600;margin:0 0 6px">${OFFLINE_TEXT[1]}</p>
<p style="opacity:.6;margin:0">${OFFLINE_TEXT[2]}</p></div>`;

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(
        () => new Response(OFFLINE_HTML, { headers: { "content-type": "text/html; charset=utf-8" } }),
      ),
    );
  }
});

// Push "nudges" arrive with no payload. Show a random, generic line that says
// nothing about the app, the sender or the content.
// Lines a day-planner app would plausibly send.
const NUDGES_EN = [
  ["Reminder", "Don't forget to check your list today."],
  ["Today", "You have something on your list."],
  ["Reminder", "Take a short break and stretch."],
  ["Planner", "Your weekly summary is ready."],
  ["Today", "A good time to plan the rest of your day."],
  ["Reminder", "Drink a glass of water."],
  ["Planner", "Your list is up to date."],
  ["Today", "Small steps count. Tick one thing off."],
];

const NUDGES_TR = [
  ["Hatırlatma", "Bugün listene göz atmayı unutma."],
  ["Bugün", "Listende bir şey var."],
  ["Hatırlatma", "Kısa bir mola ver ve biraz esne."],
  ["Planlayıcı", "Haftalık özetin hazır."],
  ["Bugün", "Günün geri kalanını planlamak için iyi bir zaman."],
  ["Hatırlatma", "Bir bardak su iç."],
  ["Planlayıcı", "Listen güncel."],
  ["Bugün", "Küçük adımlar da sayılır. Bir şeyi tamamla."],
];

const NUDGES = TURKISH ? NUDGES_TR : NUDGES_EN;

self.addEventListener("push", (event) => {
  const [title, body] = NUDGES[Math.floor(Math.random() * NUDGES.length)];
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag: "nudge", // one at a time; a new nudge replaces the old one
      renotify: true,
      silent: false,
    }),
  );
});

// Opening the notification lands on the front page; signing in is still required.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
      return open ? open.focus() : self.clients.openWindow("/");
    }),
  );
});
