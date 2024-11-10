import { useEffect } from 'react';
import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/service-worker-offline.js')
          .then((registration) => {
            console.log('Service Worker registered with scope:', registration.scope);
          })
          .catch((err) => {
            console.error('Service Worker registration failed:', err);
          });
      });
    }
  }, []);

  return <Component {...pageProps} />;
}

export default MyApp;