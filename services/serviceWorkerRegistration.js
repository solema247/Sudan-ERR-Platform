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
    .register('/sw.js') // Ensure the correct path to the service worker
    .then((registration) => {
      console.log('Service Worker registered successfully with scope:', registration.scope);

      // Listen for updates to the Service Worker
      registration.addEventListener('updatefound', () => {
        const newSW = registration.installing;
        if (newSW) {
          newSW.addEventListener('statechange', () => {
            if (newSW.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                console.log('New Service Worker installed. Ready to handle updates.');
              } else {
                console.log('Service Worker installed for the first time.');
              }
            }
          });
        }
      });
    })
    .catch((err) => {
      console.error('Service Worker registration failed:', err);
    });
}

