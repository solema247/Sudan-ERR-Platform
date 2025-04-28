import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../../ui/Button';
import FormBubble from '../../ui/FormBubble';
import MessageBubble from '../../ui/MessageBubble';

interface ProjectDraft {
    id: string;
    project_objectives: string;
    last_modified: string;
    state: string;
    locality: string;
}

interface ProjectDraftsProps {
    drafts: ProjectDraft[];
    onEditDraft: (draftId: string) => void;
    onDeleteDraft: (draftId: string) => void;
    onNewProject: () => void;
    onReturnToMenu: () => void;
}

const ProjectDrafts: React.FC<ProjectDraftsProps> = ({
    drafts,
    onEditDraft,
    onDeleteDraft,
    onNewProject,
    onReturnToMenu
}) => {
    const { t } = useTranslation('projectApplication');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDeleteDraft = async (draftId: string) => {
        if (!confirm(t('drafts.confirmDelete'))) {
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/project-drafts?id=${draftId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to delete draft');
            }

            onDeleteDraft(draftId);
        } catch (err) {
            console.error('Error deleting draft:', err);
            setError(t('drafts.deleteError'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <FormBubble>
            <div className="space-y-4">
                <h2 className="text-xl font-bold mb-4">{t('drafts.title')}</h2>

                {error && (
                    <MessageBubble>
                        <div className="text-red-600">
                            {error}
                        </div>
                    </MessageBubble>
                )}

                <Button 
                    text={t('drafts.newProject')}
                    onClick={onNewProject}
                    className="w-full"
                    disabled={isLoading}
                />

                {drafts.length === 0 ? (
                    <MessageBubble>
                        {t('drafts.noDrafts')}
                    </MessageBubble>
                ) : (
                    <div className="space-y-4">
                        {drafts.map((draft) => (
                            <div key={draft.id} className="p-4 border rounded-lg bg-white">
                                <h3 className="font-bold">
                                    {draft.project_objectives || t('drafts.untitled')}
                                </h3>
                                <p className="text-sm text-gray-600">
                                    {draft.state} - {draft.locality}
                                </p>
                                <p className="text-sm text-gray-600">
                                    {t('drafts.lastModified')}: {new Date(draft.last_modified).toLocaleString()}
                                </p>
                                <div className="flex space-x-2 mt-2">
                                    <Button 
                                        text={t('drafts.continue')}
                                        onClick={() => onEditDraft(draft.id)}
                                        disabled={isLoading}
                                    />
                                    <Button 
                                        text={t('drafts.delete')}
                                        onClick={() => handleDeleteDraft(draft.id)}
                                        variant="danger"
                                        disabled={isLoading}
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
                    disabled={isLoading}
                />
            </div>
        </FormBubble>
    );
};

export default ProjectDrafts; 