const CACHE_NAME = 'reloj-v4.9'; // increment to force update
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

  // 1. COMPLETELY IGNORE CLOCK REQUESTS
  // If the protocol is HTTP (while the app is HTTPS) or it matches clock patterns,
  // we MUST return and not call event.respondWith().
  // This allows the browser's "Insecure Content" setting to take effect.
  const isHttp = url.protocol === 'http:';
  const isSse = url.pathname.endsWith('/events');
  const isRelojLocal = url.hostname.endsWith('reloj.local');
  const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(url.hostname);

  if (isHttp || isSse || isRelojLocal || isIp) {
    return; 
  }

  // 2. ONLY HANDLE APP ASSETS
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(err => {
        return caches.match(event.request).then(res => {
          if (res) return res;
          throw err;
        });
      })
  );
});
