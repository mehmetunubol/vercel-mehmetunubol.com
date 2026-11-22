// Office service worker: makes the app installable and keeps static assets
// fast. API responses and pages are never cached (they're private and live).
const STATIC_CACHE = "office-static-v2";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const OFFLINE_HTML = `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Office</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;
font:16px -apple-system,system-ui,sans-serif;background:#121315;color:#f2eee6">
<div style="text-align:center;padding:24px"><p style="font-weight:600;margin:0 0 6px">You're offline</p>
<p style="opacity:.6;margin:0">Office will reconnect when you're back online.</p></div>`;

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
const NUDGES = [
  ["Reminder", "Your weekly summary is ready."],
  ["Update", "Something new is waiting for you."],
  ["Reminder", "Don't forget to check your list today."],
  ["Sync complete", "Your items are up to date."],
  ["Heads up", "You have a new update."],
  ["Reminder", "Take a short break and stretch."],
  ["Backup", "Your backup finished successfully."],
  ["Today", "A new tip is available."],
];

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
