// pages/login.tsx

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next'; // Import translation hook
import Image from 'next/image';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import OfflineForm from '../components/forms/OfflineForm';
import { newSupabase } from '../services/newSupabaseClient';
import Link from 'next/link';
const LogoImage = '/icons/icon-512x512.png';
import i18n from '../services/i18n'; 

/**
 * Login.tsx
 * 
 * UI for logging in
 */

export interface User {
    err_id: string
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

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Set initial status
        setIsOffline(!navigator.onLine);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);
    

    // Login form submission handler
    const handleLogin = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');
        setIsLoading(true);

        if (isOffline) { // Prevent login while offline
            setError(t('offlineLoginError'));
            setIsLoading(false);
            return;
        }

        try {
            console.log('Attempting login...');
            // Sign in with Supabase Auth
            const { data: authData, error: signInError } = await newSupabase.auth.signInWithPassword({
                email,
                password
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

            // Store the session
            if (authData.session) {
                localStorage.setItem('supabase.auth.token', JSON.stringify(authData.session));
            }

            console.log('Auth successful, fetching user data...');
            // Fetch user's role and status from our users table
            const { data: userData, error: userError } = await newSupabase
                .from('users')
                .select('role, status, display_name')
                .eq('id', authData.user.id)
                .single();

            if (userError) {
                setError(t('userDataError'));
                setIsLoading(false);
                return;
            }

            // Check if user is approved
            if (userData.status !== 'active') {
                setError(t('accountPending'));
                setIsLoading(false);
                return;
            }

            // Successful login
            router.push('/menu');

        } catch (error) {
            console.error('Login error:', error);
            setError(t('unexpectedError')); // Use translated fallback error message
        } finally {
            setIsLoading(false);
        }
    };

    // Handlers for offline mode modal
    const handleOfflineModeClick = () => setShowOfflineForm(true);
    const closeOfflineForm = () => setShowOfflineForm(false);

    // Navigate back to the home page
    const handleBackToHome = () => {
        sessionStorage.setItem('fromInternalPage', 'true');
        router.push('/');
    };

    // Language Switcher
    const switchLanguage = async (lang: string) => {
        await i18n.changeLanguage(lang); // Synchronize i18next
        router.push(router.pathname, router.asPath, { locale: lang });
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-gray-50">
            {/* Logo and Title */}
            <div className="flex flex-col items-center mb-6">
                <Image
                    src={LogoImage}
                    alt={t('logoAlt')}
                    width={100}
                    height={100}
                    className="mb-2"
                    priority
                />

                <h1 className="text-xl font-bold text-center">{t('welcomeMessage')}</h1>
            </div>

            {/* Network Status Indicator */}
            {isOffline && (
                <p className="text-sm text-red-500 mt-2">{t('offlineWarning')}</p>
            )}

            {/* Language Switcher */}
            <div className="flex justify-center mb-4">
                <button onClick={() => switchLanguage('en')} className="mx-2">
                    English
                </button>
                <button onClick={() => switchLanguage('ar')} className="mx-2">
                    العربية
                </button>
                {/*<button onClick={() => switchLanguage('es')} className="mx-2">
                    Español
                </button>*/}
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
                />
            </form>

            {/* Error Message */}
            {error && <p className="text-red-500 mt-2">{error}</p>}

            {/* Registration Link - New Addition */}
            <div className="mt-4 text-center">
                <p className="text-sm text-gray-600 mb-2">{t('newUser')}</p>
                <Link 
                    href="/register" 
                    className="text-blue-500 hover:text-blue-700 font-medium"
                >
                    {t('registerLink')}
                </Link>
            </div>

            {/* Back to Home Button */}
            <div className="mt-4">
                <button
                    onClick={handleBackToHome}
                    className="text-blue-500 hover:underline"
                >
                    {t('backToHome')}
                </button>
            </div>

            {/* Offline Form Modal */}
            {showOfflineForm && (
                <div className="modal-container fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center">
                    <div className="bg-white p-4 rounded-lg shadow-md w-11/12 max-w-2xl max-h-screen overflow-y-auto">
                        <button
                            onClick={closeOfflineForm}
                            className="text-red-500 float-right mb-2"
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