const CACHE_NAME = 'offline-chatbot-cache-v1';
const urlsToCache = [
  '/',
  '/offline-mode',
  '/_next/static/*',
  '/static/offline.js',
  '/static/style.css',
  '/favicon.ico',
  '/manifest.json',
];

// Install event: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(urlsToCache);
    })
  );
});

// Fetch event: serve from cache or fetch from network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/offline-mode');
        }
      });
    })
  );
});

// Activate event: remove old caches
self.addEventListener('activate', (event) => {
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
          removeStoredForm(formData);
        } else {
          console.error('Form submission failed:', response.statusText);
        }
      } catch (error) {
        console.error('Error submitting form:', error);
      }
    }
  }
}

// Utility function to get stored forms from IndexedDB or localStorage
function getStoredForms() {
  return new Promise((resolve) => {
    const storedForms = JSON.parse(localStorage.getItem('offlineForms') || '[]');
    resolve(storedForms);
  });
}

// Utility function to remove a submitted form from storage
function removeStoredForm(formData) {
  const storedForms = JSON.parse(localStorage.getItem('offlineForms') || '[]');
  const updatedForms = storedForms.filter(
    (form) => form.err_id !== formData.err_id || form.date !== formData.date
  );
  localStorage.setItem('offlineForms', JSON.stringify(updatedForms));
}
