// pages/login.tsx

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import Link from 'next/link';
import { BookOpen, ExternalLink, WifiOff } from 'lucide-react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import OfflineForm from '../components/forms/OfflineForm';
import { newSupabase } from '../services/newSupabaseClient';
import { appAccess } from '../services/appAccess';
import i18n from '../services/i18n';

const LogoImage = '/brand/err-logo.png';

/**
 * Login — merged former MainApp landing:
 * credentials + icon actions (user guide, LCC, offline).
 */

export interface User {
  err_id: string;
}

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showOfflineForm, setShowOfflineForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isOffline, setIsOffline] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const { t } = useTranslation('login');
  const locale = router.locale || 'en';

  useEffect(() => {
    // Require PIN unlock from /
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem('isUnlocked') !== 'true') {
      router.replace('/');
    }
  }, [router]);

  useEffect(() => {
    const handleOfflineFormSubmitted = (event: CustomEvent) => {
      setSuccessMessage(event.detail.message);
      setTimeout(() => setSuccessMessage(''), 3000);
    };

    window.addEventListener(
      'offlineFormSubmitted',
      handleOfflineFormSubmitted as EventListener
    );

    return () => {
      window.removeEventListener(
        'offlineFormSubmitted',
        handleOfflineFormSubmitted as EventListener
      );
    };
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    if (isOffline) {
      setError(t('offlineLoginError'));
      setIsLoading(false);
      return;
    }

    try {
      const { data: authData, error: signInError } =
        await newSupabase.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError) {
        console.error('Auth error:', signInError);
        setError(t('loginError'));
        setIsLoading(false);
        return;
      }

      if (!authData.user) {
        console.error('No user data returned');
        setError(t('loginError'));
        setIsLoading(false);
        return;
      }

      if (authData.session) {
        localStorage.setItem(
          'supabase.auth.token',
          JSON.stringify(authData.session)
        );
      }

      const { data: userData, error: userError } = await newSupabase
        .from('users')
        .select('role, status, display_name')
        .eq('auth_user_id', authData.user.id)
        .single();

      if (userError) {
        setError(t('userDataError'));
        setIsLoading(false);
        return;
      }

      const access = appAccess(userData);
      if (access !== 'ok') {
        await newSupabase.auth.signOut();
        localStorage.removeItem('supabase.auth.token');
        setError(t(access === 'pending' ? 'accountPending' : 'noAccess'));
        setIsLoading(false);
        return;
      }

      router.push('/home');
    } catch (err) {
      console.error('Login error:', err);
      setError(t('unexpectedError'));
    } finally {
      setIsLoading(false);
    }
  };

  const closeOfflineForm = () => setShowOfflineForm(false);

  const lockApp = () => {
    sessionStorage.removeItem('isUnlocked');
    sessionStorage.removeItem('fromInternalPage');
    router.push('/');
  };

  const switchLanguage = async (lang: string) => {
    await i18n.changeLanguage(lang);
    router.push(router.pathname, router.asPath, { locale: lang });
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen px-4 py-10 app-page-bg overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -start-16 h-64 w-64 rounded-full bg-brand-orange/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 -end-20 h-72 w-72 rounded-full bg-[#5D7EB3]/35 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 start-1/4 h-48 w-48 rounded-full bg-brand-orange/15 blur-3xl"
      />

      <div className="relative z-10 w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4 h-[5.5rem] w-[5.5rem] rounded-3xl bg-white flex items-center justify-center shadow-lift">
            <Image
              src={LogoImage}
              alt={t('logoAlt')}
              width={88}
              height={88}
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-xl font-bold text-center text-white leading-snug px-2">
            {t('welcomeMessage')}
          </h1>
        </div>

        {isOffline && (
          <p className="text-sm text-brand-orange text-center mb-3">
            {t('offlineWarning')}
          </p>
        )}

        <div className="flex justify-center gap-2 mb-5">
          {[
            { code: 'en', label: 'English' },
            { code: 'ar', label: 'العربية' },
          ].map((lang) => {
            const active = locale === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => switchLanguage(lang.code)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-brand-orange text-[#152238]'
                    : 'bg-white/10 text-[#a8b6cc] hover:bg-white/15 hover:text-white'
                }`}
              >
                {lang.label}
              </button>
            );
          })}
        </div>

        {successMessage && (
          <div className="mb-4 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 px-3 py-2 text-sm text-center">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col space-y-3.5">
          <Input
            type="email"
            placeholder={t('emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            placeholder={t('passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            text={isLoading ? t('loggingIn') : t('loginButton')}
            type="submit"
            disabled={isLoading}
            className="!m-0 !mt-1 w-full !rounded-xl !bg-brand-orange !text-[#152238] !shadow-soft hover:!bg-[#ffb88a] font-bold py-3"
          />

          <Link
            href="/reset-password"
            className="text-sm text-[#9BB0D4] hover:text-brand-orange text-center pt-1 transition-colors"
          >
            {t('forgotPassword')}
          </Link>
        </form>

        {error && (
          <p className="text-sm text-red-300 mt-3 text-center bg-red-500/10 border border-red-400/20 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        {/* Former landing actions as compact icons */}
        <div className="mt-8 flex items-start justify-center gap-6">
          <a
            href="/guides/user-guide.pdf"
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center gap-1.5 w-20 text-[#a8b6cc] hover:text-brand-orange transition-colors"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1c2d48] border border-white/10">
              <BookOpen className="h-5 w-5" />
            </span>
            <span className="text-[11px] font-medium text-center leading-tight">
              {t('userGuide')}
            </span>
          </a>

          <a
            href="https://lccsudan.org/"
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center gap-1.5 w-20 text-[#a8b6cc] hover:text-brand-orange transition-colors"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1c2d48] border border-white/10">
              <ExternalLink className="h-5 w-5" />
            </span>
            <span className="text-[11px] font-medium text-center leading-tight">
              {t('lccWebsite')}
            </span>
          </a>

          <button
            type="button"
            onClick={() => router.push('/offline-mode')}
            className="flex flex-col items-center gap-1.5 w-20 text-[#a8b6cc] hover:text-brand-orange transition-colors"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1c2d48] border border-white/10">
              <WifiOff className="h-5 w-5" />
            </span>
            <span className="text-[11px] font-medium text-center leading-tight">
              {t('offlineMode')}
            </span>
          </button>
        </div>

        <div className="mt-6 flex flex-col items-center gap-3 text-sm">
          <Link
            href="/register"
            className="text-[#9BB0D4] hover:text-brand-orange font-medium transition-colors"
          >
            {t('registerLink')}
          </Link>
          <button
            type="button"
            onClick={lockApp}
            className="text-[#8a97ab] hover:text-white transition-colors"
          >
            {t('lockApp')}
          </button>
        </div>
      </div>

      {showOfflineForm && (
        <div className="modal-container fixed inset-0 z-50 bg-[#0f1828]/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="app-panel p-4 w-11/12 max-w-2xl max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={closeOfflineForm}
              className="text-brand-orange float-end mb-2 text-sm font-semibold"
            >
              {t('closeButton')}
            </button>
            <OfflineForm
              onClose={closeOfflineForm}
              onSubmitSuccess={() => console.log('Submit success')}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
