import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../../ui/Button';
import FormBubble from '../../ui/FormBubble';
import MessageBubble from '../../ui/MessageBubble';
import { newSupabase } from '../../../services/newSupabaseClient';

interface FundingCycle {
    id: string;
    name: string;
    cycle_number: number;
    year: number;
    start_date: string | null;
    end_date: string | null;
    state_amount: number | null;
    allocation_id: string | null;
}

interface FundingCycleSelectionProps {
    onSelectFundingCycle: (cycle: FundingCycle) => void;
    onReturnToMenu: () => void;
}

const FundingCycleSelection: React.FC<FundingCycleSelectionProps> = ({ onSelectFundingCycle, onReturnToMenu }) => {
    const { t } = useTranslation('projectApplication');
    const [cycles, setCycles] = useState<FundingCycle[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userState, setUserState] = useState<string>('');

    useEffect(() => {
        const fetchCycles = async () => {
            try {
                const { data: { session } } = await newSupabase.auth.getSession();
                if (!session) throw new Error('No active session');

                const response = await fetch('/api/funding-cycles', {
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    }
                });
                if (!response.ok) throw new Error('Failed to fetch funding cycles');
                const data = await response.json();
                if (!data.success) throw new Error(data.message || 'Failed to fetch cycles');
                setCycles(data.cycles || []);
                setUserState(data.user_state || '');
            } catch (err) {
                console.error('Error fetching funding cycles:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        };
        fetchCycles();
    }, []);

    const formatDate = (dateString?: string | null) => (dateString ? new Date(dateString).toLocaleDateString() : '—');
    const formatAmount = (amount?: number | null) => amount == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

    if (loading) {
        return (
            <FormBubble>
                <MessageBubble>{t('loading')}</MessageBubble>
            </FormBubble>
        );
    }

    if (error) {
        return (
            <FormBubble>
                <MessageBubble>
                    <div className="text-red-600">{t('errors.fetchGrantCallsError')}: {error}</div>
                </MessageBubble>
                <Button text={t('returnToMenu')} onClick={onReturnToMenu} />
            </FormBubble>
        );
    }

    return (
        <FormBubble>
            <div className="space-y-4">
                <h2 className="text-xl font-bold mb-4">{t('grantCalls.title')}</h2>

                {userState && (
                    <p className="text-sm text-gray-600 mb-4">
                        {t('grantCalls.availableForState')}: <strong>{userState}</strong>
                    </p>
                )}

                {cycles.length === 0 ? (
                    <MessageBubble>{t('grantCalls.noCallsAvailable')}</MessageBubble>
                ) : (
                    <div className="space-y-4">
                        {cycles.map((cycle) => (
                            <div key={cycle.id} className="p-4 border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
                                <h3 className="font-bold text-lg mb-2">
                                    {cycle.name} — {cycle.year}/#{cycle.cycle_number}
                                </h3>
                                <div className="space-y-2 text-sm">
                                    <p><strong>{t('grantCalls.availableAmount')}:</strong> {formatAmount(cycle.state_amount)}</p>
                                    <p><strong>{t('grantCalls.period')}:</strong> {formatDate(cycle.start_date)} - {formatDate(cycle.end_date)}</p>
                                </div>
                                <div className="mt-4">
                                    <Button text={t('grantCalls.selectCall')} onClick={() => onSelectFundingCycle(cycle)} className="w-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <Button text={t('returnToMenu')} onClick={onReturnToMenu} className="w-full mt-4" />
            </div>
        </FormBubble>
    );
};

export default FundingCycleSelection;


