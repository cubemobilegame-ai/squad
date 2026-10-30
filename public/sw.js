/* SQUAD – service worker: powiadomienia push (Firebase Cloud Messaging) + komunikat bez internetu */
try {
  importScripts("/config.js");
  importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js", "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");
  firebase.initializeApp(self.SQUAD_CONFIG);
  firebase.messaging(); // powiadomienia w tle pokazuje biblioteka Firebase (z linkiem do czatu / dropa)
} catch (e) {}
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("notificationclick", (e) => {
  const url = (e.notification.data && (e.notification.data.url || (e.notification.data.FCM_MSG && e.notification.data.FCM_MSG.data && e.notification.data.FCM_MSG.data.url))) || "/";
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) if ("focus" in c) { c.navigate(url).catch(() => {}); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || e.request.mode !== "navigate") return;
  e.respondWith(fetch(e.request).catch(() => new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><body style="background:#0b0b12;color:#fff;font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0;text-align:center"><div><h1>📡</h1><p>Brak internetu – SQUAD wróci, gdy złapiesz zasięg.</p></div>', { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } })));
});
