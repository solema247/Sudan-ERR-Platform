//pages/index.tsx
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import Button from '../components/Button';
import Image from 'next/image';

const Home = () => {
    const router = useRouter();
    const { t } = useTranslation('home'); // Use 'home' namespace for translations

    // Handlers for button navigation
    const handleLogin = () => router.push('/login');
    const handleOfflineMode = () => router.push('/offline-mode');

    // Language switcher
    const switchLanguage = (lang: string) => {
        router.push(router.pathname, router.asPath, { locale: lang });
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-4">
            {/* Logo and Title */}
            <div className="text-center mb-8">
                {/* Centered Icon */}
                <div className="flex justify-center mb-4">
                    <Image
                        src="/icons/icon-512x512.png"
                        alt="App Icon"
                        width={100}
                        height={100}
                    />
                </div>
                {/* Welcome Message */}
                <h1 className="text-2xl font-bold text-black">
                    {t('welcome')}
                </h1>
            </div>

            {/* Navigation Buttons */}
            <div className="flex flex-col space-y-4 w-full max-w-sm">
                <Button text={t('login')} onClick={handleLogin} />
                <Button text={t('offlineMode')} onClick={handleOfflineMode} />
            </div>

            {/* Language Switcher */}
            <div className="flex justify-center mt-6 space-x-4">
                <button
                    onClick={() => switchLanguage('en')}
                    className="px-3 py-1 border text-sm rounded border-gray-300 bg-white hover:bg-gray-200"
                >
                    English
                </button>
                <button
                    onClick={() => switchLanguage('ar')}
                    className="px-3 py-1 border text-sm rounded border-gray-300 bg-white hover:bg-gray-200"
                >
                    العربية
                </button>
                <button
                    onClick={() => switchLanguage('es')}
                    className="px-3 py-1 border text-sm rounded border-gray-300 bg-white hover:bg-gray-200"
                >
                    Español
                </button>
            </div>
        </div>
    );
};

export default Home;



