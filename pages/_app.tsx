//pages/_app.tsx
import { useEffect } from 'react';
import '../styles/globals.css';
import { registerServiceWorker } from '../services/serviceWorkerRegistration';
import { handleOnline } from '../services/handleOnline';
import { appWithTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import i18n from '../services/i18n'; // Import i18n initialization

function MyApp({ Component, pageProps }) {
  const router = useRouter();

  // Register the service worker and setup online/offline event listeners
  useEffect(() => {
    console.log('Initializing service worker and network event listeners.');

    // Register service worker
    registerServiceWorker();

    // Handle online and offline events
    const onOnline = () => {
      console.log('Network connectivity restored. Processing queued submissions.');
      handleOnline();
    };

    const onOffline = () => {
      console.log('App is now offline. Queued submissions will sync when online.');
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    // Cleanup event listeners on unmount
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Update document attributes based on locale
  useEffect(() => {
    console.log(`Setting language and direction attributes for locale: ${router.locale}`);

    const dir = router.locale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', router.locale || 'en');

    // Synchronize i18next with Next.js locale
    if (router.locale) {
      i18n.changeLanguage(router.locale).then(() => {
        console.log(`Language successfully changed to ${router.locale}`);
      }).catch((error) => {
        console.error('Error changing language:', error);
      });
    }
  }, [router.locale]);

  // Render the application
  return <Component {...pageProps} />;
}

export default appWithTranslation(MyApp);
