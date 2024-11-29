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
                return fetch(event.request).catch(() =>
                  new Response('Offline page not available.', {
                    status: 503,
                    headers: { 'Content-Type': 'text/plain' },
                  })
                );
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

// Sync event: process queued form submissions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-forms') {
    event.waitUntil(processOfflineForms());
  }
});

// Function to process queued form submissions
async function processOfflineForms() {
  const storedForms = await getStoredForms();
  if (storedForms.length > 0) {
    for (const formData of storedForms) {
      try {
        const response = await fetch('/api/offline-mode', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });
        if (response.ok) {
          console.log('Form submitted successfully:', formData);
          await removeStoredForm(formData);
        } else {
          console.error('Form submission failed:', response.statusText);
        }
      } catch (error) {
        console.error('Error submitting form:', error);
      }
    }
  }
}

// IndexedDB utility functions for handling stored forms
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('offlineQueueDB', 1);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains('offlineQueue')) {
        db.createObjectStore('offlineQueue', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getStoredForms() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('offlineQueue', 'readonly');
    const store = transaction.objectStore('offlineQueue');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function removeStoredForm(formData) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('offlineQueue', 'readwrite');
    const store = transaction.objectStore('offlineQueue');
    const request = store.openCursor();
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        const record = cursor.value;
        if (
          record.formData.err_id === formData.formData.err_id &&
          record.formData.date === formData.formData.date
        ) {
          cursor.delete();
        }
        cursor.continue();
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
}
