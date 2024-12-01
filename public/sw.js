// public/sw.js
const CACHE_NAME = 'offline-chatbot-cache-v1';
const urlsToCache = [
  '/',
  '/login',
  '/menu',
  '/offline-mode',
  '/styles/globals.css',
  '/favicon.ico',
  '/manifest.json',
  '/locales/en/login.json',
  '/locales/ar/login.json',
  '/locales/es/login.json',
  '/locales/en/home.json',
  '/locales/ar/home.json',
  '/locales/es/home.json'
];

// Install event: cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Install event triggered');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return Promise.all(
          urlsToCache.map((url) =>
            cache.add(url).catch((err) => console.error(`Failed to cache ${url}:`, err))
          )
        );
      })
      .catch((error) => console.error('Failed to cache assets on install:', error))
  );
});

// Fetch event: serve from cache or fetch from network
self.addEventListener('fetch', (event) => {
  console.log('Service Worker: Fetch event for', event.request.url);

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }

        return fetch(event.request)
          .then((fetchResponse) => {
            return caches.open(CACHE_NAME).then((cache) => {
              // Dynamically cache fetched files for offline use
              if (event.request.url.includes('/locales/')) {
                cache.put(event.request, fetchResponse.clone());
              }
              return fetchResponse;
            });
          })
          .catch(() => {
            // Return offline page for navigation requests when offline
            if (event.request.mode === 'navigate') {
              return caches.match('/offline-mode').then((fallbackResponse) => {
                if (fallbackResponse) {
                  return fallbackResponse;
                }
                console.error('Offline fallback not available in cache.');
                return new Response('Offline page not available.', {
                  status: 503,
                  headers: { 'Content-Type': 'text/plain' },
                });
              });
            }
          });
      })
      .catch((error) => console.error('Fetch failed:', error))
  );
});

// Activate event: remove old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activate event triggered');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
  self.clients.claim();
});
