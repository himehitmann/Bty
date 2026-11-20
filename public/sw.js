/* Cache the public shell and assets. Account, auth and catalog requests use the network. */
const CACHE = "navier-shell-v1";
const SHELL = ["/manifest.webmanifest", "/icons/navier-192.png", "/icons/navier-512.png", "/images/skincare-editorial.webp", "/images/serum.webp", "/images/lipstick.webp", "/images/cream.webp", "/fonts/dm-sans.woff2", "/fonts/playfair.woff2", "/offline.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((key) => key.startsWith("navier-shell-") && key !== CACHE).map((key) => caches.delete(key))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate" && url.pathname === "/" && !url.search) {
    event.respondWith(fetch(event.request).then(async (response) => {
      if (response.ok && !response.redirected && !/private|no-store/i.test(response.headers.get("cache-control") ?? "")) {
        const cache = await caches.open(CACHE);
        await cache.put("/", response.clone());
      }
      return response;
    }).catch(async () => (await caches.match("/")) || (await caches.match("/offline.html"))));
    return;
  }
  if (url.search || ![...SHELL, "/_next/static/"].some((path) => path.endsWith("/") ? url.pathname.startsWith(path) : url.pathname === path)) return;
  event.respondWith(caches.match(event.request).then((stored) => stored || fetch(event.request).then(async (response) => {
    if (response.ok) {
      const cache = await caches.open(CACHE);
      await cache.put(event.request, response.clone());
    }
    return response;
  })));
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "WARM_SHELL") return;
  event.waitUntil(caches.open(CACHE).then(async (cache) => {
    const assets = Array.isArray(event.data.assets) ? event.data.assets.filter((asset) => {
      if (typeof asset !== "string") return false;
      const url = new URL(asset, self.location.origin);
      return url.origin === self.location.origin && url.pathname.startsWith("/_next/static/") && !url.search;
    }) : [];
    await Promise.allSettled([...new Set(["/", ...assets])].map(async (asset) => {
      const response = await fetch(asset, { credentials: "omit" });
      if (response.ok && !response.redirected) await cache.put(asset, response);
    }));
  }));
});
