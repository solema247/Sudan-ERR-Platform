import { useEffect } from 'react';
import '../styles/globals.css';
import { registerServiceWorker } from '../lib/serviceWorkerRegistration';

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return <Component {...pageProps} />;
}

export default MyApp;
