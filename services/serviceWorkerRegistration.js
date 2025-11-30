// lib/serviceWorkerRegistration.js

export function registerServiceWorker() {
  console.log('App component mounted, checking for service worker support...');

  if ('serviceWorker' in navigator) {
    console.log('Service worker supported, proceeding with registration...');

    if (document.readyState === 'complete') {
      console.log('Document already loaded, registering service worker...');
      registerSW();
    } else {
      window.addEventListener('load', () => {
        console.log('Window load event triggered, attempting to register service worker...');
        registerSW();
      });
    }
  } else {
    console.warn('Service worker not supported in this browser.');
  }
}

function registerSW() {
  navigator.serviceWorker
    .register('/sw.js', { updateViaCache: 'none' }) // Always check for updates
    .then((registration) => {
      console.log('Service Worker registered successfully with scope:', registration.scope);

      // Check for immediate updates
      registration.update();

      // Listen for updates to the Service Worker
      registration.addEventListener('updatefound', () => {
        console.log('New service worker found, installing...');
        const newSW = registration.installing;
        if (newSW) {
          newSW.addEventListener('statechange', () => {
            if (newSW.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // There's a new service worker available
                console.log('New Service Worker installed. Clearing caches and reloading...');
                
                // Clear all caches
                if ('caches' in window) {
                  caches.keys().then((cacheNames) => {
                    return Promise.all(
                      cacheNames.map((cacheName) => {
                        console.log('Clearing cache:', cacheName);
                        return caches.delete(cacheName);
                      })
                    );
                  }).then(() => {
                    console.log('All caches cleared. Reloading page...');
                    // Reload the page to get fresh HTML with new build ID
                    window.location.reload();
                  });
                } else {
                  // If caches API not available, just reload
                  window.location.reload();
                }
              } else {
                console.log('Service Worker installed for the first time.');
              }
            }
            
            if (newSW.state === 'activated') {
              console.log('New Service Worker activated');
            }
          });
        }
      });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SW_UPDATED') {
          console.log('Service Worker updated with cache version:', event.data.cacheVersion);
          // Optionally reload if needed
          if (registration.waiting) {
            console.log('New service worker is waiting, reloading...');
            window.location.reload();
          }
        }
      });

      // Periodically check for updates (every hour)
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000);
    })
    .catch((err) => {
      console.error('Service Worker registration failed:', err);
    });
}


