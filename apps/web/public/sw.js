const CACHE = "kms-v1";
const PRECACHE = ["/", "/login", "/projekty", "/dokumenty", "/icon-192.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(clients.claim());
});
