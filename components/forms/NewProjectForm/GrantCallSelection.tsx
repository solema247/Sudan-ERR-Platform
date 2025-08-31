import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../../ui/Button';
import FormBubble from '../../ui/FormBubble';
import MessageBubble from '../../ui/MessageBubble';
import { newSupabase } from '../../../services/newSupabaseClient';

interface GrantCall {
    id: string;
    allocation_id: string;
    name: string;
    shortname: string | null;
    donor_name: string;
    state_amount: number;
    total_amount: number;
    start_date: string;
    end_date: string;
}

interface GrantCallSelectionProps {
    onSelectGrantCall: (grantCall: GrantCall) => void;
    onReturnToMenu: () => void;
}

const GrantCallSelection: React.FC<GrantCallSelectionProps> = ({
    onSelectGrantCall,
    onReturnToMenu
}) => {
    const { t } = useTranslation('projectApplication');
    const [grantCalls, setGrantCalls] = useState<GrantCall[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userState, setUserState] = useState<string>('');

    useEffect(() => {
        const fetchGrantCalls = async () => {
            try {
                const { data: { session } } = await newSupabase.auth.getSession();
                
                if (!session) {
                    throw new Error('No active session');
                }

                const response = await fetch('/api/grant-calls', {
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch grant calls');
                }

                const data = await response.json();
                if (data.success) {
                    setGrantCalls(data.grant_calls);
                    setUserState(data.user_state);
                } else {
                    throw new Error(data.message || 'Failed to fetch grant calls');
                }
            } catch (err) {
                console.error('Error fetching grant calls:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        };

        fetchGrantCalls();
    }, []);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    if (loading) {
        return (
            <FormBubble>
                <MessageBubble>
                    {t('loading')}
                </MessageBubble>
            </FormBubble>
        );
    }

    if (error) {
        return (
            <FormBubble>
                <MessageBubble>
                    <div className="text-red-600">
                        {t('errors.fetchGrantCallsError')}: {error}
                    </div>
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

                {grantCalls.length === 0 ? (
                    <MessageBubble>
                        {t('grantCalls.noCallsAvailable')}
                    </MessageBubble>
                ) : (
                    <div className="space-y-4">
                        {grantCalls.map((grantCall) => (
                            <div key={grantCall.id} className="p-4 border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
                                <h3 className="font-bold text-lg mb-2">
                                    {grantCall.shortname || grantCall.name}
                                </h3>
                                <div className="space-y-2 text-sm">
                                    <p><strong>{t('grantCalls.donor')}:</strong> {grantCall.donor_name}</p>
                                    <p><strong>{t('grantCalls.availableAmount')}:</strong> {formatAmount(grantCall.state_amount)}</p>
                                    <p><strong>{t('grantCalls.period')}:</strong> {formatDate(grantCall.start_date)} - {formatDate(grantCall.end_date)}</p>
                                </div>
                                <div className="mt-4">
                                    <Button
                                        text={t('grantCalls.selectCall')}
                                        onClick={() => onSelectGrantCall(grantCall)}
                                        className="w-full"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <Button
                    text={t('returnToMenu')}
                    onClick={onReturnToMenu}
                    className="w-full mt-4"
                />
            </div>
        </FormBubble>
    );
};

export default GrantCallSelection;
