import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../../ui/Button';
import FormBubble from '../../ui/FormBubble';
import MessageBubble from '../../ui/MessageBubble';

interface FinancialReportDraft {
    id: string;
    project_id: string;
    created_at: string;
    report_date: string;
    total_expenses: number;
    total_grant: number;
}

interface FinancialReportDraftsProps {
    drafts: FinancialReportDraft[];
    onEditDraft: (draftId: string) => void;
    onDeleteDraft: (draftId: string) => void;
    onNewReport: () => void;
    onReturnToMenu: () => void;
}

const FinancialReportDrafts: React.FC<FinancialReportDraftsProps> = ({
    drafts,
    onEditDraft,
    onDeleteDraft,
    onNewReport,
    onReturnToMenu
}) => {
    const { t } = useTranslation('fillForm');
    const [isLoading, setIsLoading] = useState(false);

    const handleDeleteDraft = async (draft: FinancialReportDraft) => {
        if (!confirm(t('drafts.confirmDelete'))) {
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(
                `/api/financial-report-drafts?draft_id=${draft.id}&project_id=${draft.project_id}`,
                {
                    method: 'DELETE',
                    credentials: 'include'
                }
            );

            if (!response.ok) {
                throw new Error('Failed to delete draft');
            }

            onDeleteDraft(draft.id);
        } catch (err) {
            console.error('Error deleting draft:', err);
            alert(t('drafts.deleteError'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <FormBubble>
            <div className="space-y-4">
                <h2 className="text-xl font-bold mb-4">{t('drafts.title')}</h2>

                <Button 
                    text={t('drafts.newReport')}
                    onClick={onNewReport}
                    className="w-full"
                />

                {drafts.length === 0 ? (
                    <MessageBubble>{t('drafts.noDrafts')}</MessageBubble>
                ) : (
                    <div className="space-y-4">
                        {drafts.map((draft) => (
                            <div key={draft.id} className="p-4 border rounded-lg bg-white">
                                <h3 className="font-bold">
                                    {t('drafts.reportDate')}: {new Date(draft.report_date).toLocaleDateString()}
                                </h3>
                                <p className="text-sm text-gray-600">
                                    {t('drafts.totalExpenses')}: {draft.total_expenses}
                                </p>
                                <p className="text-sm text-gray-600">
                                    {t('drafts.totalGrant')}: {draft.total_grant}
                                </p>
                                <div className="flex space-x-2 mt-2">
                                    <Button 
                                        text={t('drafts.continue')}
                                        onClick={() => onEditDraft(draft.id)}
                                    />
                                    <Button 
                                        text={t('drafts.delete')}
                                        onClick={() => handleDeleteDraft(draft)}
                                        variant="danger"
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <Button
                    text={t('drafts.returnToMenu')}
                    onClick={onReturnToMenu}
                    className="w-full mt-4"
                />
            </div>
        </FormBubble>
    );
};

export default FinancialReportDrafts; 