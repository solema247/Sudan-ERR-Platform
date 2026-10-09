import { useEffect } from 'react';
import Head from 'next/head';
import '../styles/globals.css';
import {
  registerServiceWorker,
  onServiceWorkerUpdate,
} from '../services/serviceWorkerRegistration';
import { handleOnline } from '../services/handleOnline';
import { appWithTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import i18n from '../services/i18n';
import { ensureOfflineDbReady } from '../lib/offline/offlineQueue';

function MyApp({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    ensureOfflineDbReady().catch(() => {});

    if (process.env.NODE_ENV === 'production') {
      onServiceWorkerUpdate(() => {
        window.dispatchEvent(new CustomEvent('swUpdateAvailable'));
      });
      registerServiceWorker();
    } else if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      });
      if ('caches' in window) {
        caches.keys().then((names) => names.forEach((name) => caches.delete(name)));
      }
    }

    const onOnline = () => {
      handleOnline();
    };

    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

  useEffect(() => {
    const dir = router.locale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', router.locale || 'en');

    if (router.locale) {
      i18n.changeLanguage(router.locale).catch(() => {});
    }
  }, [router.locale]);

  return (
    <>
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"
        />
      </Head>
      <Component {...pageProps} />
    </>
  );
}

export default appWithTranslation(MyApp);
