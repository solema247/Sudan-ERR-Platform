// pages/_app.tsx
import { useEffect } from 'react';
import '../styles/globals.css';
import { registerServiceWorker } from '../lib/serviceWorkerRegistration';
import { handleOnline } from '../lib/handleOnline'; 

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    registerServiceWorker();

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return <Component {...pageProps} />;
}

export default MyApp;
