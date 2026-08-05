// Club Cheeky service worker — the PWA hook that makes the site
// installable and powers the Android Trusted Web Activity wrapper.
// Network-first with cache fallback: the live club always wins, but a
// dead signal still shows the last good page instead of a blank wall.
const CACHE = 'club-cheeky-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const isNavigate = request.mode === 'navigate';

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const fresh = await fetch(request);
        if (
          fresh.ok &&
          new URL(request.url).origin === self.location.origin
        ) {
          cache.put(request, fresh.clone());
        }
        return fresh;
      } catch (err) {
        const cached = await cache.match(request, { ignoreSearch: true });
        if (cached) return cached;
        if (isNavigate) {
          const home = await cache.match('/');
          if (home) return home;
        }
        throw err;
      }
    })()
  );
});
