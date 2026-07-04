// yappinourholes service worker — app-shell caching so the PWA launches
// instantly and opens offline (to its normal "waiting to connect" state; the
// call itself needs the network + a live peer). No push, no background sync.
//
// Bump CACHE when the caching strategy or precache list changes so old caches
// are dropped on activate. (This SW is byte-static across deploys, so the app
// shell + manifest are fetched network-first — only immutable hashed build
// assets are ever served cache-first — which keeps content fresh while online
// even without a SW update.)
const CACHE = "yoh-shell-v2";

// Minimal shell: the app is a single client-rendered route, so precaching "/"
// plus the icons is enough to cold-start offline. Hashed Next build assets are
// filled in at runtime by the fetch handler below.
const PRECACHE = ["/", "/icon-192.png", "/icon-512.png"];

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

// only these are safe to serve cache-first: Next's content-hashed build output
// is immutable, and our icons rarely change. Everything else stays network-first
// so a deploy's fresh HTML/manifest/RSC reaches online users without a SW update.
const isImmutable = (url) =>
  url.pathname.startsWith("/_next/static/") || /\/icon-\d|\/apple-icon|\.(png|svg|ico|woff2?)$/.test(url.pathname);

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never touch PeerJS/WebRTC or other origins

  // Navigations: network-first so a fresh shell wins; cache only clean, final
  // responses, and fall back to the cached shell offline.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        try {
          const fresh = await fetch(req);
          // never cache errors or redirects as the app shell, or a deploy-time
          // 5xx would stick forever
          if (fresh.ok && fresh.type === "basic" && !fresh.redirected) {
            cache.put("/", fresh.clone());
          }
          return fresh;
        } catch {
          return (await cache.match("/")) || Response.error();
        }
      })(),
    );
    return;
  }

  // Immutable build assets / icons: cache-first, fill on miss.
  if (isImmutable(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const hit = await cache.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res.ok && res.type === "basic") cache.put(req, res.clone());
          return res;
        } catch {
          return hit || Response.error();
        }
      })(),
    );
    return;
  }

  // Everything else same-origin (manifest, RSC/data payloads, etc.):
  // network-first with a cache fallback, so it refreshes online but still
  // works offline once seen. Never cache-first, so it can't go stale.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const res = await fetch(req);
        if (res.ok && res.type === "basic") cache.put(req, res.clone());
        return res;
      } catch {
        return (await cache.match(req)) || Response.error();
      }
    })(),
  );
});
