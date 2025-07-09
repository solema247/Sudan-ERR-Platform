import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Link from 'next/link';
import { newSupabase } from '../../services/newSupabaseClient';

const LogoImage = '/icons/icon-512x512.png';

interface EmergencyRoom {
    id: string;
    name: string;
    name_ar: string | null;
    type: 'state' | 'base';
}

const UserRegistration = () => {
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [displayName, setDisplayName] = useState('');
    const [selectedRoom, setSelectedRoom] = useState<EmergencyRoom | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const router = useRouter();
    const { t, i18n } = useTranslation('register');
    const { err: roomId } = router.query;

    // Fetch selected room details
    useEffect(() => {
        const fetchRoomDetails = async () => {
            if (roomId) {
                try {
                    const { data, error } = await newSupabase
                        .from('emergency_rooms')
                        .select('id, name, name_ar, type')
                        .eq('id', roomId)
                        .single();

                    if (error) throw error;
                    if (data) setSelectedRoom(data);
                } catch (err) {
                    console.error('Error fetching room details:', err);
                    setError(t('roomFetchError'));
                }
            }
        };

        fetchRoomDetails();
    }, [roomId, t]);

    const validateEmail = (email: string) => {
        const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        const commonTypos = {
            '.cm': '.com',
            '.con': '.com',
            '.comm': '.com',
            '.ocm': '.com',
            '.og': '.org',
            '.ogr': '.org',
            '.ney': '.net',
            '.ed': '.edu'
        };

        if (!emailRegex.test(email)) {
            // Check for common typos
            let suggestion = email;
            Object.entries(commonTypos).forEach(([typo, correct]) => {
                if (email.endsWith(typo)) {
                    suggestion = email.slice(0, -typo.length) + correct;
                }
            });
            
            if (suggestion !== email) {
                setEmailError(t('emailTypoSuggestion', { suggestion }));
            } else {
                setEmailError(t('invalidEmail'));
            }
            return false;
        }
        setEmailError('');
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRoom) return;

        setError('');
        setEmailError('');
        setPasswordError('');
        
        // Validate email
        if (!validateEmail(email)) {
            return;
        }

        // Validate passwords match
        if (password !== confirmPassword) {
            setPasswordError(t('passwordsDoNotMatch'));
            return;
        }

        setIsLoading(true);

        try {
            // Register with Supabase Auth
            const { data: authData, error: authError } = await newSupabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: 'https://sudan-err-bot.vercel.app/login'
                }
            });

            if (authError) throw authError;

            // Create user record
            const { error: userError } = await newSupabase
                .from('users')
                .insert([{
                    id: authData.user?.id,
                    auth_user_id: authData.user?.id,
                    err_id: selectedRoom.id,
                    display_name: displayName,
                    role: selectedRoom.type === 'state' ? 'state_err' : 'base_err',
                    status: 'pending'
                }]);

            if (userError) throw userError;

            // Success - redirect to login with message
            router.push('/login?registered=true');

        } catch (err) {
            console.error('Registration error:', err);
            setError(t('registrationError'));
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
                <h1 className="text-xl font-bold text-center">{t('userRegistrationTitle')}</h1>
                {selectedRoom && (
                    <p className="text-gray-600 mt-2">
                        {t('registeringFor')} {i18n.language === 'ar' && selectedRoom.name_ar ? selectedRoom.name_ar : selectedRoom.name}
                    </p>
                )}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col space-y-4 w-full max-w-xs">
                <div className="space-y-1">
                    <Input
                        type="email"
                        placeholder={t('emailPlaceholder')}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    {emailError && <p className="text-red-500 text-sm">{emailError}</p>}
                </div>

                <div className="space-y-1">
                    <div className="relative">
                        <Input
                            type={showPassword ? "text" : "password"}
                            placeholder={t('passwordPlaceholder')}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <button
                            type="button"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                {showPassword ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                )}
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="space-y-1">
                    <div className="relative">
                        <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder={t('confirmPasswordPlaceholder')}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                        <button
                            type="button"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                {showConfirmPassword ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                )}
                            </svg>
                        </button>
                    </div>
                    {passwordError && <p className="text-red-500 text-sm">{passwordError}</p>}
                </div>
                <Input
                    type="text"
                    placeholder={t('displayNamePlaceholder')}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                />

                {error && <p className="text-red-500 text-sm">{error}</p>}

                <div className="flex flex-col space-y-2">
                    <Button
                        text={isLoading ? t('registering') : t('registerButton')}
                        type="submit"
                        disabled={isLoading}
                    />
                    <Link 
                        href="/register"
                        className="text-blue-500 hover:text-blue-700 text-center mt-4"
                    >
                        {t('backToRoomSelection')}
                    </Link>
                </div>
            </form>
        </div>
    );
};

export default UserRegistration; 