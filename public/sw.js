/* Squad – service worker: powiadomienia push (Firebase Cloud Messaging) + komunikat bez internetu */
/* kliknięcie w powiadomienie: od razu właściwy czat / drop (ten handler jest przed Firebase, żeby to on decydował) */
self.addEventListener("notificationclick", (e) => {
  const d = e.notification.data || {}, F = d.FCM_MSG || {};
  let url = d.url || (F.data && F.data.url) || (F.fcmOptions && F.fcmOptions.link) || (F.notification && F.notification.click_action) || "/";
  try { const u = new URL(url, self.location.origin); url = u.origin === self.location.origin ? u.pathname + u.search + (/^#(map)$/.test(u.hash) ? u.hash : "") : "/"; } catch (x) { url = "/"; }
  e.stopImmediatePropagation();
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    const c = list.find((w) => new URL(w.url).origin === self.location.origin);
    if (c) { c.postMessage({ type: "open", url }); return c.focus().catch(() => {}); }
    return self.clients.openWindow(url);
  }));
});
try {
  importScripts("/config.js");
  importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js", "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");
  firebase.initializeApp(self.SQUAD_CONFIG);
  firebase.messaging(); // powiadomienia w tle pokazuje biblioteka Firebase (z linkiem do czatu / dropa)
} catch (e) {}
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || e.request.mode !== "navigate") return;
  e.respondWith(fetch(e.request).catch(() => new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><body style="background:#0b0b12;color:#fff;font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0;text-align:center"><div><h1>📡</h1><p>Brak internetu – Squad wróci, gdy złapiesz zasięg.</p></div>', { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } })));
});
