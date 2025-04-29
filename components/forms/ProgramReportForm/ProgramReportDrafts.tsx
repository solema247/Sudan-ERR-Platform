import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../../ui/Button';
import FormBubble from '../../ui/FormBubble';
import MessageBubble from '../../ui/MessageBubble';

interface ProgramReportDraft {
    id: string;
    project_id: string;
    created_at: string;
    report_date: string;
    positive_changes: string;
    reporting_person: string;
    err_program_reach: any[];
}

interface ProgramReportDraftsProps {
    drafts: ProgramReportDraft[];
    onEditDraft: (draftId: string) => void;
    onDeleteDraft: (draftId: string) => void;
    onNewReport: () => void;
    onReturnToMenu: () => void;
}

const ProgramReportDrafts: React.FC<ProgramReportDraftsProps> = ({
    drafts,
    onEditDraft,
    onDeleteDraft,
    onNewReport,
    onReturnToMenu
}) => {
    const { t: tProgram } = useTranslation('program-report');
    const { t: tMenu } = useTranslation('menu');
    const [isLoading, setIsLoading] = useState(false);

    const handleDeleteDraft = async (draft: ProgramReportDraft) => {
        if (!confirm(tProgram('drafts.confirmDelete'))) {
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(
                `/api/program-report-drafts?draft_id=${draft.id}&project_id=${draft.project_id}`,
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
            alert(tProgram('drafts.deleteError'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <FormBubble>
            <div className="space-y-4">
                <Button 
                    text={tMenu('program.newReport')}
                    onClick={onNewReport}
                    className="w-full"
                />

                <div className="mt-4 mb-4">
                    {drafts.length === 0 ? (
                        <MessageBubble className="text-center">
                            {tProgram('drafts.noDrafts')}
                        </MessageBubble>
                    ) : (
                        <div className="space-y-4">
                            {drafts.map((draft) => (
                                <div key={draft.id} className="p-4 border rounded-lg bg-white">
                                    <h3 className="font-bold">
                                        {tProgram('drafts.reportDate')}: {new Date(draft.report_date).toLocaleDateString()}
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                        {tProgram('drafts.reportingPerson')}: {draft.reporting_person}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        {tProgram('drafts.activitiesCount')}: {draft.err_program_reach?.length || 0}
                                    </p>
                                    <div className="flex space-x-2 mt-2">
                                        <Button 
                                            text={tProgram('drafts.continue')}
                                            onClick={() => onEditDraft(draft.id)}
                                        />
                                        <Button 
                                            text={tProgram('drafts.delete')}
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

export default ProgramReportDrafts; 