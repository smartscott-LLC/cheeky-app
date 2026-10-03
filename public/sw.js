// Club Cheeky service worker — the PWA hook that makes the site
// installable and powers the Android Trusted Web Activity wrapper.
//
// Split strategy (fixes the boot-flicker: a cached HTML shell from an old
// build pointing at chunks a new build no longer serves):
//   • hashed /_next/static chunks are immutable → cache-first, they never change
//   • every page (HTML) is network-only → the live club always wins, and a
//     stale shell can never be served across deploys
//   • everything else same-origin: network-first with cache fallback, so a
//     dead signal still shows the last good asset instead of a blank wall
const CACHE = 'club-cheeky-v2';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Drop every cache not on the current version — old shells and their
  // orphaned chunk copies leave with the deploy that made them stale.
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // Only same-origin requests. Third-party traffic (analytics, CDNs, fonts)
  // goes straight through untouched — intercepting it only produces failed
  // fetches when a blocker or a network error kills it.
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Immutable build chunks: cache wins (a hit for the same URL is the same bytes).
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const hit = await cache.match(request);
        if (hit) return hit;
        const fresh = await fetch(request);
        if (fresh.ok) void cache.put(request, fresh.clone());
        return fresh;
      })()
    );
    return;
  }

  // HTML navigations: network only. Never serve a cached shell across deploys.
  if (request.mode === 'navigate') return;

  // Everything else (public assets, images): network-first, cache fallback.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const fresh = await fetch(request);
        if (fresh.ok) void cache.put(request, fresh.clone());
        return fresh;
      } catch {
        const cached = await cache.match(request);
        return cached ?? Response.error();
      }
    })()
  );
});
