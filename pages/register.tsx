import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import Button from '../components/ui/Button';
import { newSupabase } from '../services/newSupabaseClient';
import Link from 'next/link';

const LogoImage = '/icons/icon-512x512.png';

interface EmergencyRoom {
    id: string;
    name: string;
    name_ar: string | null;
    type: 'state' | 'base';
}

interface State {
    id: string;
    state_name: string;
    state_name_ar: string;
}

const Register = () => {
    const [emergencyRooms, setEmergencyRooms] = useState<EmergencyRoom[]>([]);
    const [selectedType, setSelectedType] = useState<'state' | 'base' | ''>('');
    const [selectedErr, setSelectedErr] = useState('');
    const [states, setStates] = useState<State[]>([]);
    const [selectedState, setSelectedState] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const router = useRouter();
    const { t, i18n } = useTranslation('register');

    // Fetch states on component mount
    useEffect(() => {
        const fetchStates = async () => {
            try {
                const { data, error } = await newSupabase
                    .from('states')
                    .select('id, state_name, state_name_ar')
                    .order('state_name');

                if (error) throw error;
                
                // Remove duplicates based on state_name
                const uniqueStates = data?.filter((state, index, self) =>
                    index === self.findIndex((s) => s.state_name === state.state_name)
                );
                
                setStates(uniqueStates || []);
            } catch (err) {
                console.error('Error fetching states:', err);
                setError(t('stateFetchError'));
            }
        };

        fetchStates();
    }, [t]);

    // Fetch ERRs when state and type are selected
    useEffect(() => {
        if (selectedState && selectedType) {
            const fetchERRs = async () => {
                try {
                    // First get all localities for the selected state
                    const { data: localities, error: localitiesError } = await newSupabase
                        .from('states')
                        .select('id')
                        .eq('state_name', states.find(s => s.id === selectedState)?.state_name);

                    if (localitiesError) throw localitiesError;

                    if (!localities || localities.length === 0) {
                        setEmergencyRooms([]);
                        return;
                    }

                    // Then get all rooms that reference these localities
                    const localityIds = localities.map(l => l.id);
                    const { data, error } = await newSupabase
                        .from('emergency_rooms')
                        .select('id, name, name_ar, type')
                        .eq('type', selectedType)
                        .in('state_reference', localityIds)
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
    }, [selectedState, selectedType, t, states]);

    // Reset selected ERR and type when state changes
    useEffect(() => {
        setSelectedErr('');
        setSelectedType('');
    }, [selectedState]);

    const handleContinue = () => {
        if (selectedErr) {
            router.push(`/register/user?err=${selectedErr}`);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-gray-50">
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
                <h1 className="text-xl font-bold text-center">{t('selectRoomTitle')}</h1>
            </div>

            <div className="flex flex-col space-y-4 w-full max-w-xs">
                {/* State Selection */}
                <div className="w-full">
                    <select
                        className="w-full p-2 border rounded"
                        value={selectedState}
                        onChange={(e) => setSelectedState(e.target.value)}
                    >
                        <option value="">{t('selectState')}</option>
                        {states.map((state) => (
                            <option key={state.id} value={state.id}>
                                {i18n.language === 'ar' ? state.state_name_ar : state.state_name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* ERR Type Selection - Only shown after state is selected */}
                {selectedState && (
                    <div className="w-full">
                        <select
                            className="w-full p-2 border rounded"
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value as 'state' | 'base')}
                        >
                            <option value="">{t('selectRoomType')}</option>
                            <option value="state">{t('stateErr')}</option>
                            <option value="base">{t('baseErr')}</option>
                        </select>
                    </div>
                )}

                {/* ERR Selection - Only shown after type is selected */}
                {selectedState && selectedType && (
                    <div className="w-full">
                        <select
                            className="w-full p-2 border rounded"
                            value={selectedErr}
                            onChange={(e) => setSelectedErr(e.target.value)}
                        >
                            <option value="">{t('selectRoom')}</option>
                            {emergencyRooms.map((room) => (
                                <option key={room.id} value={room.id}>
                                    {i18n.language === 'ar' && room.name_ar ? room.name_ar : room.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {error && <p className="text-red-500 text-sm">{error}</p>}

                {/* Continue Button */}
                <Button
                    text={t('continueWithSelected')}
                    onClick={handleContinue}
                    disabled={!selectedErr}
                />

                {/* Can't find room link */}
                <div className="text-center">
                    <Link 
                        href="/register/new-room"
                        className="text-blue-500 hover:text-blue-700"
                    >
                        {t('cantFindRoom')} {t('registerHere')}
                    </Link>
                </div>

                {/* Back to Login link */}
                <Link 
                    href="/login"
                    className="text-blue-500 hover:text-blue-700 text-center"
                >
                    {t('backToLogin')}
                </Link>
            </div>
        </div>
    );
};

export default Register; 