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
    type: 'state' | 'base';
    legacy_err_id: string;
}

const Register = () => {
    const [emergencyRooms, setEmergencyRooms] = useState<EmergencyRoom[]>([]);
    const [selectedType, setSelectedType] = useState<'state' | 'base' | ''>('');
    const [selectedErr, setSelectedErr] = useState('');
    const [error, setError] = useState('');

    const router = useRouter();
    const { t } = useTranslation('register');

    // Fetch ERRs when type is selected
    useEffect(() => {
        if (selectedType) {
            const fetchERRs = async () => {
                try {
                    const { data, error } = await newSupabase
                        .from('emergency_rooms')
                        .select('id, name, type, legacy_err_id')
                        .eq('type', selectedType)
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
    }, [selectedType, t]);

    // Reset selected ERR when type changes
    useEffect(() => {
        setSelectedErr('');
    }, [selectedType]);

    const handleContinue = () => {
        if (selectedErr) {
            router.push(`/register/user?err=${selectedErr}`);
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
                <h1 className="text-xl font-bold text-center">{t('selectRoomTitle')}</h1>
            </div>

            <div className="flex flex-col space-y-4 w-full max-w-xs">
                {/* ERR Type Selection */}
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

                {/* ERR Selection - Only shown after type is selected */}
                {selectedType && (
                    <div className="w-full">
                        <select
                            className="w-full p-2 border rounded"
                            value={selectedErr}
                            onChange={(e) => setSelectedErr(e.target.value)}
                        >
                            <option value="">{t('selectRoom')}</option>
                            {emergencyRooms.map((room) => (
                                <option key={room.id} value={room.id}>
                                    {room.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {error && <p className="text-red-500 text-sm">{error}</p>}

                <Button
                    text={t('continueWithSelected')}
                    onClick={handleContinue}
                    disabled={!selectedErr}
                />

                <div className="text-center">
                    <Link 
                        href="/register/new-room"
                        className="text-blue-500 hover:text-blue-700"
                    >
                        {t('cantFindRoom')} {t('registerHere')}
                    </Link>
                </div>

                <Button
                    text={t('backToLogin')}
                    onClick={() => router.push('/login')}
                />
            </div>
        </div>
    );
};

export default Register; 