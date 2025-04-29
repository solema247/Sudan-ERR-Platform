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
    const { t: tFinancial } = useTranslation('financial-report');
    const { t: tMenu } = useTranslation('menu');
    const [isLoading, setIsLoading] = useState(false);

    const handleDeleteDraft = async (draft: FinancialReportDraft) => {
        if (!confirm(tFinancial('drafts.confirmDelete'))) {
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
            alert(tFinancial('drafts.deleteError'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <FormBubble>
            <div className="space-y-4">
                <Button 
                    text={tMenu('financial.newReport')}
                    onClick={onNewReport}
                    className="w-full"
                />

                <div className="mt-4 mb-4">
                    {drafts.length === 0 ? (
                        <div className="text-center">
                            <MessageBubble>
                                {tFinancial('drafts.noDrafts')}
                            </MessageBubble>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {drafts.map((draft) => (
                                <div key={draft.id} className="p-4 border rounded-lg bg-white">
                                    <h3 className="font-bold">
                                        {tFinancial('drafts.reportDate')}: {new Date(draft.report_date).toLocaleDateString()}
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                        {tFinancial('drafts.totalExpenses')}: {draft.total_expenses}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        {tFinancial('drafts.totalGrant')}: {draft.total_grant}
                                    </p>
                                    <div className="flex space-x-2 mt-2">
                                        <Button 
                                            text={tFinancial('drafts.continue')}
                                            onClick={() => onEditDraft(draft.id)}
                                        />
                                        <Button 
                                            text={tFinancial('drafts.delete')}
                                            onClick={() => handleDeleteDraft(draft)}
                                            variant="danger"
                                            disabled={isLoading}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </FormBubble>
    );
};

export default FinancialReportDrafts; 