const CACHE = 'cultivar-v1';
const PRECACHE = [
  '/cultivar/',
  '/cultivar/index.html',
  '/cultivar/decks.html',
  '/cultivar/cards.html',
  '/cultivar/dash.html',
  '/cultivar/revise.html',
  '/cultivar/review.html',
  '/cultivar/admin.html',
  '/cultivar/style.css',
  '/cultivar/js/config.js',
  '/cultivar/js/srs.js',
  '/cultivar/js/db.js',
  '/cultivar/cultivarlogo.png',
  '/cultivar/manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Let Firebase, Google auth, and CDN requests go through unintercepted
  if (url.hostname.endsWith('googleapis.com') ||
      url.hostname.endsWith('firebaseapp.com') ||
      url.hostname.endsWith('gstatic.com') ||
      url.hostname.endsWith('google.com')) {
    return;
  }
  // Cache-first for app shell; cache unknown requests on the fly
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (response.ok && e.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return response;
      });
    })
  );
});
