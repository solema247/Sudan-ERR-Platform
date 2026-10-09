import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import { newSupabase } from '../../../services/newSupabaseClient';
import { HomeCard } from '../../home/HomeSection';
import { WorkPlanScene, ApprovalsScene } from '../../home/illustrations';

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
    const { t } = useTranslation('project-application');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDeleteDraft = async (draftId: string) => {
        if (!confirm(t('drafts.confirmDelete', 'Are you sure you want to delete this draft?'))) {
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const { data: { session } } = await newSupabase.auth.getSession();
            
            if (!session) {
                throw new Error('No active session');
            }

            const response = await fetch(`/api/project-drafts?id=${draftId}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete draft');
            }

            onDeleteDraft(draftId);
        } catch (err) {
            console.error('Error deleting draft:', err);
            setError(t('drafts.deleteError', 'Failed to delete draft'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <div className="mb-6">
                <p className="app-section-label mb-1">
                    {t('drafts.hubSectionLabel', { defaultValue: 'F1 · Work Plans' })}
                </p>
                <h2 className="text-xl font-bold text-white leading-snug mb-1">
                    {t('drafts.hubTitle', { defaultValue: 'F1 Work Plans' })}
                </h2>
                <p className="text-sm text-[#a8b6cc] mb-0">
                    {t('drafts.hubSubtitle', {
                        defaultValue:
                            'Continue a saved draft or start a new work plan for your room.',
                    })}
                </p>
            </div>

            {error && (
                <div className="mb-4 rounded-xl bg-red-500/10 border border-red-400/30 text-red-300 px-3 py-2 text-sm">
                    {error}
                </div>
            )}

            <section className="mb-6">
                <div className="-mx-4 overflow-x-auto pb-2 scrollbar-none">
                    <div className="flex w-max min-w-full gap-3 px-4 snap-x snap-mandatory items-stretch">
                        <HomeCard
                            onClick={() => !isLoading && onNewProject()}
                            code="New"
                            title="Create an F1"
                            subtitle="Work plan for your room"
                            illustration={WorkPlanScene}
                            wash="bg-brand-orangeSoft"
                            size="md"
                        />

                        {drafts.length === 0 ? (
                            <HomeCard
                                code="Drafts"
                                title="F1 drafts"
                                subtitle="Saved drafts will show up here"
                                illustration={ApprovalsScene}
                                wash="bg-[#7B96C4]"
                                size="md"
                            />
                        ) : (
                            drafts.map((draft) => (
                                <div
                                    key={draft.id}
                                    className="snap-start shrink-0 w-[11.5rem] sm:w-[12.5rem] overflow-hidden rounded-2xl border border-white/10 shadow-lift flex flex-col"
                                >
                                    <button
                                        type="button"
                                        onClick={() => !isLoading && onEditDraft(draft.id)}
                                        disabled={isLoading}
                                        className="flex flex-col flex-1 text-start hover:border-brand-orange/40 active:scale-[0.98] transition-all disabled:opacity-50"
                                    >
                                        <div className="relative h-[6.75rem] overflow-hidden bg-[#9BB0D4]">
                                            <span className="absolute inset-x-0 top-0 z-10 px-2.5 pt-2">
                                                <span className="text-[10px] font-bold uppercase tracking-wide text-[#152238]/80 bg-white/75 px-1.5 py-0.5 rounded-md">
                                                    Draft
                                                </span>
                                            </span>
                                            <WorkPlanScene className="absolute inset-0 h-full w-full" />
                                        </div>
                                        <div className="bg-[#152238] px-3 py-3 flex-1">
                                            <span className="block font-bold text-white text-sm leading-snug line-clamp-2">
                                                {draft.project_objectives || t('drafts.untitled', 'Untitled Project')}
                                            </span>
                                            <span className="block text-[11px] text-[#a8b6cc] mt-0.5 leading-snug">
                                                {[draft.state, draft.locality].filter(Boolean).join(' · ') ||
                                                    t('drafts.continue', 'Continue')}
                                            </span>
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteDraft(draft.id)}
                                        disabled={isLoading}
                                        className="bg-[#152238] border-t border-white/10 py-2 text-xs font-semibold text-red-300 hover:bg-white/5 disabled:opacity-50"
                                    >
                                        {t('drafts.delete', 'Delete')}
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </section>

            <button
                type="button"
                onClick={onReturnToMenu}
                disabled={isLoading}
                className="inline-flex items-center gap-1 text-sm font-medium text-[#8a97ab] hover:text-brand-orange px-0.5 py-2 transition-colors"
            >
                <ChevronRight className="h-4 w-4 rotate-180 rtl:rotate-0" />
                {t('returnToMenu', 'Return to Menu')}
            </button>
        </div>
    );
};

export default ProjectDrafts;
