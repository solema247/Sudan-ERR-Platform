import { useEffect } from 'react';
import '../styles/globals.css';
import { registerServiceWorker } from '../lib/serviceWorkerRegistration';
import { handleOnline } from '../lib/handleOnline';
import { appWithTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import i18n from '../lib/i18n'; // Import i18n initialization

function MyApp({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    registerServiceWorker();

    // Handle online events
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  useEffect(() => {
    // Dynamically set direction and lang attributes based on locale
    const dir = router.locale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', router.locale || 'en'); // Set the lang attribute

    // Synchronize i18next with Next.js locale
    if (router.locale) {
      i18n.changeLanguage(router.locale);
    }
  }, [router.locale]);

  return <Component {...pageProps} />;
}

export default appWithTranslation(MyApp);
