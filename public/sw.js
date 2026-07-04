// yappinourholes service worker — app-shell caching so the PWA launches
// instantly and opens offline (to its normal "waiting to connect" state; the
// call itself needs the network + a live peer). No push, no background sync.
//
// Bump CACHE when the caching strategy or precache list changes so old caches
// are cleared on activate.
const CACHE = "yoh-shell-v1";

// Minimal shell: the app is a single client-rendered route, so precaching "/"
// plus the icons is enough to cold-start offline. Hashed Next build assets are
// picked up at runtime by the fetch handler below.
const PRECACHE = ["/", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // don't let one 404 abort the whole precache
      await Promise.allSettled(PRECACHE.map((url) => cache.add(url)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never touch PeerJS/WebRTC or other origins

  // Navigations: network-first so a fresh shell wins, cache fallback offline.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(CACHE);
          cache.put("/", fresh.clone());
          return fresh;
        } catch {
          const cache = await caches.open(CACHE);
          return (await cache.match(req)) || (await cache.match("/")) || Response.error();
        }
      })(),
    );
    return;
  }

  // Static assets (Next build output, icons, fonts): cache-first, fill on miss.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok && (res.type === "basic" || res.type === "default")) cache.put(req, res.clone());
        return res;
      } catch {
        return hit || Response.error();
      }
    })(),
  );
});
