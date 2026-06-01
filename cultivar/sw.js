// v6 — clears all caches and stops intercepting fetches.
// This breaks out of any stale-cache loop. Add caching back once stable.
const CACHE_VERSION = 'cultivar-v6';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
  );
  self.clients.claim();
});

// No fetch handler — every request goes straight to the network.
