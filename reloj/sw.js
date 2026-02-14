const CACHE_NAME = 'reloj-v4.8'; // increment to force update
const ASSETS = [
  './',
  './index.html',
  './script.js',
  './style.css',
  './manifest.webmanifest',
  './programs.json',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css'
];

// On install: cache files
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
});

// On activate: delete old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// On fetch: Network-first strategy with selective caching
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 1. Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // 2. Identify and skip clock-specific communication
  const isSelf = url.origin === self.location.origin;
  const isSse = url.pathname.endsWith('/events');
  const isRelojLocal = url.hostname.endsWith('reloj.local');
  const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(url.hostname);

  // We only treat it as a "clock request" if it's NOT our own origin
  // This prevents issues when testing the app on http://127.0.0.1:5500
  const isExternalClock = !isSelf && (isIp || isRelojLocal);

  if (isSse || isExternalClock) {
    return; // Direct browser handling
  }

  // 3. App assets: Network-first, fallback to cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses from our origin or CDNs
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(err => {
        // Fallback to cache if network fails
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) return cachedResponse;
          // If no cache and no network, re-throw to let browser handle as network error
          // instead of returning undefined (which causes a TypeError in respondWith)
          throw err;
        });
      })
  );
});
