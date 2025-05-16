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
    type: 'state' | 'base';
}

const UserRegistration = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [selectedRoom, setSelectedRoom] = useState<EmergencyRoom | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const router = useRouter();
    const { t } = useTranslation('register');
    const { err: roomId } = router.query;

    // Fetch selected room details
    useEffect(() => {
        const fetchRoomDetails = async () => {
            if (roomId) {
                try {
                    const { data, error } = await newSupabase
                        .from('emergency_rooms')
                        .select('id, name, type')
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRoom) return;

        setError('');
        setIsLoading(true);

        try {
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
                        {t('registeringFor')} {selectedRoom.name}
                    </p>
                )}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col space-y-4 w-full max-w-xs">
                <Input
                    type="email"
                    placeholder={t('emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <Input
                    type="password"
                    placeholder={t('passwordPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
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