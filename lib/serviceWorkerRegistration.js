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
    console.log('Service worker not supported in this browser.');
  }
}

function registerSW() {
  navigator.serviceWorker
    .register('/sw.js') // Ensure the correct path to the service worker
    .then((registration) => {
      console.log('Service Worker registered successfully with scope:', registration.scope);

      // Register background sync for form submissions
      if ('sync' in registration) {
        console.log('Background sync supported, attempting to register sync event...');

        registration.addEventListener('updatefound', () => {
          const newSW = registration.installing;
          newSW?.addEventListener('statechange', () => {
            if (newSW.state === 'activated' && 'sync' in registration) {
              registration.sync.register('sync-offline-forms').catch((err) => {
                console.error('Background sync registration failed:', err);
              });
            }
          });
        });
      } else {
        console.log('Background sync not supported in this browser.');
      }
    })
    .catch((err) => {
      console.error('Service Worker registration failed:', err);
    });
}
