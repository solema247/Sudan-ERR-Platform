import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Link from 'next/link';
import { newSupabase } from '../../services/newSupabaseClient';

const LogoImage = '/icons/icon-512x512.png';

interface State {
    id: string;
    state_name: string;
    state_name_ar: string;
    locality?: string;
    locality_ar?: string;
}

const NewRoom = () => {
    const [roomName, setRoomName] = useState('');
    const [roomType, setRoomType] = useState<'state' | 'base'>('base');
    const [states, setStates] = useState<State[]>([]);
    const [selectedState, setSelectedState] = useState('');
    const [selectedLocality, setSelectedLocality] = useState('');
    const [localities, setLocalities] = useState<{id: string, locality: string, locality_ar: string}[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const router = useRouter();
    const { t, i18n } = useTranslation('register');

    // Fetch unique states on component mount
    useEffect(() => {
        const fetchStates = async () => {
            const { data, error } = await newSupabase
                .from('states')
                .select('id, state_name, state_name_ar')
                .order('state_name');

            if (error) {
                console.error('Error fetching states:', error);
                return;
            }

            // Remove duplicates based on state_name
            const uniqueStates = data?.filter((state, index, self) =>
                index === self.findIndex((s) => s.state_name === state.state_name)
            );

            setStates(uniqueStates || []);
        };

        fetchStates();
    }, []);

    // Fetch localities when state is selected
    useEffect(() => {
        const fetchLocalities = async () => {
            if (selectedState) {
                const { data, error } = await newSupabase
                    .from('states')
                    .select('id, locality, locality_ar')
                    .eq('state_name', states.find(s => s.id === selectedState)?.state_name)
                    .order('locality');

                if (error) {
                    console.error('Error fetching localities:', error);
                    return;
                }

                setLocalities(data || []);
                setSelectedLocality(''); // Reset locality selection
            }
        };

        fetchLocalities();
    }, [selectedState, states]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const { error: roomError } = await newSupabase
                .from('emergency_rooms')
                .insert([{
                    name: roomName,
                    type: roomType,
                    state_reference: selectedLocality, // Use the locality ID as state_reference
                    status: 'inactive'
                }]);

            if (roomError) throw roomError;

            setSuccess(true);
            setTimeout(() => {
                router.push('/register');
            }, 3000);

        } catch (err) {
            console.error('Room creation error:', err);
            setError(t('roomCreationError'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-gray-50">
            {/* Language Switcher - Add this block near the top */}
            <div className="flex justify-center mb-4">
                <button onClick={() => i18n.changeLanguage('en')} className="mx-2 text-blue-500 hover:underline">
                    English
                </button>
                <button onClick={() => i18n.changeLanguage('ar')} className="mx-2 text-blue-500 hover:underline">
                    العربية
                </button>
            </div>

            <div className="flex flex-col items-center mb-6">
                <Image
                    src={LogoImage}
                    alt={t('logoAlt')}
                    width={100}
                    height={100}
                    className="mb-2"
                    priority
                />
                <h1 className="text-xl font-bold text-center">{t('newRoomTitle')}</h1>
            </div>

            {success ? (
                <div className="text-center">
                    <p className="text-green-600 mb-4">{t('roomCreationSuccess')}</p>
                    <p className="text-gray-600">{t('roomPendingApproval')}</p>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="flex flex-col space-y-4 w-full max-w-xs">
                    <Input
                        type="text"
                        placeholder={t('roomNamePlaceholder')}
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        required
                    />

                    <select
                        className="w-full p-2 border rounded"
                        value={roomType}
                        onChange={(e) => setRoomType(e.target.value as 'state' | 'base')}
                        required
                    >
                        <option value="state">{t('stateErr')}</option>
                        <option value="base">{t('baseErr')}</option>
                    </select>

                    <select
                        className="w-full p-2 border rounded"
                        value={selectedState}
                        onChange={(e) => setSelectedState(e.target.value)}
                        required
                    >
                        <option value="">{t('selectState')}</option>
                        {states.map((state) => (
                            <option key={state.id} value={state.id}>
                                {i18n.language === 'ar' ? state.state_name_ar : state.state_name}
                            </option>
                        ))}
                    </select>

                    {selectedState && (
                        <select
                            className="w-full p-2 border rounded"
                            value={selectedLocality}
                            onChange={(e) => setSelectedLocality(e.target.value)}
                            required
                        >
                            <option value="">{t('selectLocality')}</option>
                            {localities.map((loc) => (
                                <option key={loc.id} value={loc.id}>
                                    {i18n.language === 'ar' ? loc.locality_ar : loc.locality}
                                </option>
                            ))}
                        </select>
                    )}

                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    <div className="flex flex-col space-y-2">
                        <Button
                            text={isLoading ? t('creating') : t('createRoom')}
                            type="submit"
                            disabled={isLoading}
                        />
                        <Link 
                            href="/register"
                            className="text-blue-500 hover:text-blue-700 text-center mt-4"
                        >
                            {t('backToRegister')}
                        </Link>
                    </div>
                </form>
            )}
        </div>
    );
};

export default NewRoom; 