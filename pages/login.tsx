// pages/login.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next'; // Import translation hook
import Image from 'next/image';
import Input from '../components/Input';
import Button from '../components/Button';
import OfflineForm from '../components/OfflineForm';
import LogoImage from '../public/avatar.JPG';
import i18n from '../lib/i18n'; 

const Login = () => {
    // State management
    const [errId, setErrId] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [showOfflineForm, setShowOfflineForm] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const router = useRouter();
    const { t } = useTranslation('login'); // Load translations for the "login" namespace

    // Effect to handle custom offline form submission event
    useEffect(() => {
        const handleOfflineFormSubmitted = (event: CustomEvent) => {
            setSuccessMessage(event.detail.message);
            setTimeout(() => setSuccessMessage(''), 3000); // Hide after 3 seconds
        };

        window.addEventListener('offlineFormSubmitted', handleOfflineFormSubmitted);

        return () => {
            window.removeEventListener('offlineFormSubmitted', handleOfflineFormSubmitted);
        };
    }, []);

    // Login form submission handler
    const handleLogin = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ err_id: errId, pin }),
            });

            const data = await response.json();

            if (data.success) {
                router.push('/menu'); // Redirect to the menu page
            } else {
                setError(data.message || t('loginError')); // Use translated error message
            }
        } catch {
            setError(t('unexpectedError')); // Use translated fallback error message
        }
    };

    // Handlers for offline mode modal
    const handleOfflineModeClick = () => setShowOfflineForm(true);
    const closeOfflineForm = () => setShowOfflineForm(false);

    // Language Switcher
    const switchLanguage = async (lang: string) => {
        await i18n.changeLanguage(lang); // Synchronize i18next
        router.push(router.pathname, router.asPath, { locale: lang });
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen px-4">
            {/* Logo and Title */}
            <div className="flex flex-col items-center mb-6">
                <Image
                    src={LogoImage}
                    alt={t('logoAlt')} // Translate the alt text for the logo
                    width={100}
                    height={100}
                    className="mb-2"
                />
                <h1 className="text-xl font-bold text-center">{t('welcomeMessage')}</h1>
            </div>

            {/* Language Switcher */}
            <div className="flex justify-center mb-4">
                <button onClick={() => switchLanguage('en')} className="mx-2">
                    English
                </button>
                <button onClick={() => switchLanguage('ar')} className="mx-2">
                    العربية
                </button>
                <button onClick={() => switchLanguage('es')} className="mx-2">
                    Español
                </button>
            </div>

            {/* Success Message Notification */}
            {successMessage && (
                <div className="fixed top-4 bg-green-100 text-green-700 p-2 rounded shadow-lg">
                    {successMessage}
                </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="flex flex-col items-center space-y-4 w-full max-w-xs">
                <Input
                    type="text"
                    placeholder={t('errIdPlaceholder')} // Translate placeholder
                    value={errId}
                    onChange={(e) => setErrId(e.target.value)}
                />
                <Input
                    type="password"
                    placeholder={t('pinPlaceholder')} // Translate placeholder
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                />
                <Button text={t('loginButton')} type="submit" /> {/* Translate button text */}
            </form>

            {/* Error Message */}
            {error && <p className="text-red-500 mt-2">{error}</p>}

            {/* Offline Mode Button */}
            <button
                onClick={handleOfflineModeClick}
                className="mt-4 text-blue-500 underline"
            >
                {t('offlineModeButton')} {/* Translate offline mode button */}
            </button>

            {/* Offline Form Modal */}
            {showOfflineForm && (
                <div className="modal-container fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center">
                    <div className="bg-white p-4 rounded-lg shadow-md w-11/12 max-w-2xl max-h-screen overflow-y-auto">
                        <button
                            onClick={closeOfflineForm}
                            className="text-red-500 float-right mb-2"
                        >
                            {t('closeButton')} {/* Translate close button */}
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

