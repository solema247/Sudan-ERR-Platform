import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../../ui/Button';
import FormBubble from '../../ui/FormBubble';
import MessageBubble from '../../ui/MessageBubble';
import { newSupabase } from '../../../services/newSupabaseClient';

interface FundingPoolSummary {
    allocated: number;
    committed: number;
    pending: number;
    remaining: number;
    user_state: string | null;
}

interface FundingCycleSelectionProps { onReturnToMenu: () => void; }

const FundingCycleSelection: React.FC<FundingCycleSelectionProps> = ({ onReturnToMenu }) => {
    const { t } = useTranslation('projectApplication');
    const [pool, setPool] = useState<FundingPoolSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userState, setUserState] = useState<string>('');

    useEffect(() => {
        const fetchPool = async () => {
            try {
                const { data: { session } } = await newSupabase.auth.getSession();
                if (!session) throw new Error('No active session');

                const response = await fetch('/api/funding-pool', {
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    }
                });
                if (!response.ok) throw new Error('Failed to fetch funding pool');
                const data = await response.json();
                if (!data.success) throw new Error(data.message || 'Failed to fetch pool');
                setPool({ allocated: data.allocated || 0, committed: data.committed || 0, pending: data.pending || 0, remaining: data.remaining || 0, user_state: data.user_state || null });
                setUserState(data.user_state || '');
            } catch (err) {
                console.error('Error fetching funding pool:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        };
        fetchPool();
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

                <div className="space-y-4">
                    <div className="p-4 border rounded-lg bg-white shadow-sm">
                        <h3 className="font-bold text-lg mb-2">{t('grantCalls.title')}</h3>
                        <div className="space-y-2 text-sm">
                            <p><strong>{t('grantCalls.availableAmount')}:</strong> {formatAmount(pool?.allocated)}</p>
                            <p><strong>Committed:</strong> {formatAmount(pool?.committed)}</p>
                            <p><strong>Pending:</strong> {formatAmount(pool?.pending)}</p>
                            <p><strong>Remaining:</strong> {formatAmount(pool?.remaining)}</p>
                        </div>
                    </div>
                    <div className="mt-2">
                        <Button text={t('grantCalls.selectCall')} onClick={onReturnToMenu} className="w-full" />
                    </div>
                </div>

                <Button text={t('returnToMenu')} onClick={onReturnToMenu} className="w-full mt-4" />
            </div>
        </FormBubble>
    );
};

export default FundingCycleSelection;


