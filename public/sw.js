// public/sw.js — stable offline shell for ERR App
// Bump CACHE_VERSION (or rely on file change) on deploy to refresh precache.
const CACHE_VERSION = '5';
const CACHE_NAME = `err-app-cache-v${CACHE_VERSION}`;

const PRECACHE_URLS = [
  '/manifest.json',
  '/favicon.ico',
  '/offline-mode',
  '/home',
  '/reporting',
  '/projects',
  '/feedback',
  '/locales/en/login.json',
  '/locales/ar/login.json',
  '/locales/es/login.json',
  '/locales/en/home.json',
  '/locales/ar/home.json',
  '/locales/es/home.json',
  '/locales/en/offline-mode.json',
  '/locales/ar/offline-mode.json',
  '/locales/es/offline-mode.json',
  '/locales/en/menu.json',
  '/locales/ar/menu.json',
  '/locales/es/menu.json',
  '/locales/en/scan-form.json',
  '/locales/ar/scan-form.json',
  '/locales/es/scan-form.json',
];

self.addEventListener('install', (event) => {
  // Do NOT skipWaiting here — wait for client to accept the update (soft update).
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch((err) => console.warn('Precache failed:', url, err))
        )
      )
    )
  );
});

function isHTMLRequest(request) {
  return (
    request.mode === 'navigate' ||
    (request.headers.get('accept') || '').includes('text/html')
  );
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/locales/') ||
    url.pathname.startsWith('/brand/') ||
    url.pathname.startsWith('/styles/') ||
    /\.(css|js|png|jpg|jpeg|svg|webp|woff2?|ico)$/i.test(url.pathname)
  );
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Never intercept APIs or cross-origin
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  // Never treat the service worker script itself as a cacheable HTML page
  if (url.pathname === '/sw.js') {
    return;
  }

  if (isHTMLRequest(request)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful navigations for offline shell (clone before return)
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => {
            if (cached) return cached;
            return caches.match('/offline-mode').then(
              (offline) =>
                offline ||
                new Response('Offline', {
                  status: 503,
                  headers: { 'Content-Type': 'text/plain' },
                })
            );
          })
        )
    );
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
            }
            return response;
          })
          .catch(() => {
            if (url.pathname.includes('/locales/')) {
              return new Response('{}', {
                status: 503,
                headers: { 'Content-Type': 'application/json' },
              });
            }
            return new Response('Resource not available offline.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain' },
            });
          });
      })
    );
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

// Soft update: client asks waiting worker to activate
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
