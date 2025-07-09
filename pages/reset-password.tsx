import { useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { newSupabase } from '../services/newSupabaseClient';
import Link from 'next/link';

const LogoImage = '/icons/icon-512x512.png';

const ResetPassword = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    
    const router = useRouter();
    const { t, i18n } = useTranslation('login');

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setMessage('');

        try {
            const { error } = await newSupabase.auth.resetPasswordForEmail(email, {
                redirectTo: 'https://sudan-err-bot.vercel.app/update-password'
            });

            if (error) {
                setError(t('resetPasswordError'));
            } else {
                setMessage(t('resetPasswordSuccess'));
            }
        } catch (err) {
            setError(t('unexpectedError'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-gray-50">
            <div className="flex flex-col items-center mb-6">
                <Image
                    src={LogoImage}
                    alt={t('logoAlt')}
                    width={100}
                    height={100}
                    className="mb-2"
                    priority
                />
                <h1 className="text-xl font-bold text-center">{t('resetPasswordTitle')}</h1>
                <p className="mt-2 text-center text-gray-600">{t('resetPasswordDescription')}</p>
            </div>

            <form onSubmit={handleResetPassword} className="flex flex-col space-y-4 w-full max-w-xs">
                <Input
                    type="email"
                    placeholder={t('emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}
                />

                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                {message && <p className="text-green-500 text-sm text-center">{message}</p>}

                <Button
                    text={isLoading ? t('sendingResetLink') : t('sendResetLink')}
                    type="submit"
                    disabled={isLoading}
                />

                <Link
                    href="/login"
                    className="text-blue-500 hover:text-blue-700 text-center mt-4"
                >
                    {t('backToLogin')}
                </Link>
            </form>
        </div>
    );
};

export default ResetPassword; 