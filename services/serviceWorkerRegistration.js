// Soft-update service worker registration (no forced reload loops)

let updateCallback = null;

export function onServiceWorkerUpdate(cb) {
  updateCallback = cb;
}

export function applyServiceWorkerUpdate() {
  if (!navigator.serviceWorker) return;
  navigator.serviceWorker.getRegistration().then((registration) => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  });
}

export function registerServiceWorker() {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Skipping service worker registration in development.');
    return;
  }

  if (!('serviceWorker' in navigator)) {
    console.warn('Service worker not supported in this browser.');
    return;
  }

  const start = () => registerSW();
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start);
}

function registerSW() {
  navigator.serviceWorker
    .register('/sw.js', { updateViaCache: 'none' })
    .then((registration) => {
      console.log('Service Worker registered:', registration.scope);

      // When a new worker takes control, reload once (user-initiated soft update)
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });

      const notifyWaiting = () => {
        if (registration.waiting && navigator.serviceWorker.controller) {
          if (typeof updateCallback === 'function') {
            updateCallback(registration);
          } else {
            window.dispatchEvent(
              new CustomEvent('swUpdateAvailable', { detail: { registration } })
            );
          }
        }
      };

      if (registration.waiting) notifyWaiting();

      registration.addEventListener('updatefound', () => {
        const newSW = registration.installing;
        if (!newSW) return;
        newSW.addEventListener('statechange', () => {
          if (newSW.state === 'installed') notifyWaiting();
        });
      });

      // Periodic update check (hourly) — does not reload by itself
      setInterval(() => {
        registration.update().catch(() => {});
      }, 60 * 60 * 1000);
    })
    .catch((err) => {
      console.error('Service Worker registration failed:', err);
    });
}
