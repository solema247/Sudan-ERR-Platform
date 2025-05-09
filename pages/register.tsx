import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import Link from 'next/link';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { newSupabase } from '../services/newSupabaseClient';

const LogoImage = '/icons/icon-512x512.png';

interface EmergencyRoom {
    id: string;
    name: string;
    type: 'state' | 'base';
    legacy_err_id: string;
}

const Register = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [errType, setErrType] = useState<'state' | 'base' | ''>('');
    const [selectedErr, setSelectedErr] = useState('');
    const [emergencyRooms, setEmergencyRooms] = useState<EmergencyRoom[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const router = useRouter();
    const { t, i18n } = useTranslation('register');

    // Fetch ERRs when type is selected
    useEffect(() => {
        if (errType) {
            const fetchERRs = async () => {
                try {
                    const { data, error } = await newSupabase
                        .from('emergency_rooms')
                        .select('id, name, type, legacy_err_id')
                        .eq('type', errType)
                        .eq('status', 'active')
                        .order('name');

                    if (error) throw error;
                    setEmergencyRooms(data || []);
                } catch (err) {
                    console.error('Error fetching ERRs:', err);
                    setError(t('errFetchError'));
                }
            };

            fetchERRs();
        }
    }, [errType, t]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // Find selected ERR details
            const selectedRoom = emergencyRooms.find(room => room.id === selectedErr);
            if (!selectedRoom) {
                throw new Error('Please select an Emergency Response Room');
            }

            // Register with Supabase Auth
            const { data: authData, error: authError } = await newSupabase.auth.signUp({
                email,
                password,
            });

            if (authError) throw authError;

            // Create user record
            const { error: userError } = await newSupabase
                .from('users')
                .insert([{
                    id: authData.user?.id,
                    err_id: selectedRoom.legacy_err_id,
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
                <h1 className="text-xl font-bold text-center">{t('registerTitle')}</h1>
            </div>

            {/* Language Switcher */}
            <div className="flex justify-center mb-4">
                <button onClick={() => i18n.changeLanguage('en')} className="mx-2">
                    English
                </button>
                <button onClick={() => i18n.changeLanguage('ar')} className="mx-2">
                    العربية
                </button>
            </div>

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="flex flex-col items-center space-y-4 w-full max-w-xs">
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
                <Input
                    type="text"
                    placeholder={t('displayNamePlaceholder')}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                />

                {/* ERR Type Selection */}
                <div className="w-full">
                    <select
                        className="w-full p-2 border rounded"
                        value={errType}
                        onChange={(e) => {
                            setErrType(e.target.value as 'state' | 'base');
                            setSelectedErr(''); // Reset selected ERR when type changes
                        }}
                    >
                        <option value="">{t('selectErrType')}</option>
                        <option value="state">{t('stateErr')}</option>
                        <option value="base">{t('baseErr')}</option>
                    </select>
                </div>

                {/* ERR Selection - Only shown after type is selected */}
                {errType && (
                    <div className="w-full">
                        <select
                            className="w-full p-2 border rounded"
                            value={selectedErr}
                            onChange={(e) => setSelectedErr(e.target.value)}
                        >
                            <option value="">{t('selectErr')}</option>
                            {emergencyRooms.map((room) => (
                                <option key={room.id} value={room.id}>
                                    {room.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <Button
                    text={isLoading ? t('registering') : t('registerButton')}
                    type="submit"
                    disabled={isLoading}
                />
            </form>

            {/* Error Message */}
            {error && <p className="text-red-500 mt-2">{error}</p>}

            {/* Login Link */}
            <div className="mt-4">
                <Link href="/login" className="text-blue-500 hover:underline">
                    {t('backToLogin')}
                </Link>
            </div>
        </div>
    );
};

export default Register; 