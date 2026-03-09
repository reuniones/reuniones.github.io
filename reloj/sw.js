// Service Worker: Stale-While-Revalidate strategy
// This allows offline use but ensures the cache is updated in the background
const CACHE_NAME = 'reloj-v5.1';
const ASSETS = [
  './',
  './index.html',
  './script.js',
  './style.css',
  './manifest.webmanifest',
  './programs.json',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css',
  'https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 1. SKIP CLOCK COMMUNICATION (Mixed Content / Local Network)
  // We MUST bypass SW for these to avoid caching errors and respect browser security settings
  const isSse = url.pathname.endsWith('/events');
  const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(url.hostname);
  const isLocalDomain = url.hostname.endsWith('.local') || url.hostname.endsWith('.lan');
  
  if (isSse || isIp || isLocalDomain || event.request.method !== 'GET') {
    return;
  }

  // 2. STALE-WHILE-REVALIDATE for App Assets
  // Serve from cache immediately, then update cache from network in background
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(cachedResponse => {
        const fetchPromise = fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(err => {
          // Network failed, already handled by returning cachedResponse below
        });

        // Return cached response if available, otherwise wait for network
        return cachedResponse || fetchPromise;
      });
    })
  );
});
