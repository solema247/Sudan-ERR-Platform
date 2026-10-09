//pages/project-status.tsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { newSupabase } from '../services/newSupabaseClient';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface ProjectStatusProps {
    onReturnToMenu: () => void;
    onEditProject?: (projectId: string) => void;
}

const statusColor = (status: string) => {
    if (status === 'active') return 'text-emerald-300';
    if (status === 'pending') return 'text-brand-orange';
    if (status === 'feedback') return 'text-[#9BB0D4]';
    return 'text-[#a8b6cc]';
};

const ProjectStatus: React.FC<ProjectStatusProps> = ({ onReturnToMenu, onEditProject }) => {
    const { t, i18n } = useTranslation('project-status');
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedProject, setSelectedProject] = useState(null);
    const [feedbackMap, setFeedbackMap] = useState({});
    const [isExpanding, setIsExpanding] = useState(false);

    useEffect(() => {
        const fetchProjectStatuses = async () => {
            setLoading(true);
            try {
                const { data: { session } } = await newSupabase.auth.getSession();
                
                if (!session) {
                    throw new Error('No session found');
                }

                const res = await fetch('/api/project-status', {
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    }
                });

                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }

                const data = await res.json();
                if (data.success) {
                    setProjects(data.projects);
                    
                    const feedbackProjects = data.projects.filter(p => p.status === 'feedback');
                    await Promise.all(
                        feedbackProjects.map(async (project) => {
                            try {
                                const feedback = await fetchProjectFeedback(project.id);
                                if (feedback && Array.isArray(feedback) && feedback.length > 0) {
                                    setFeedbackMap(prev => ({
                                        ...prev,
                                        [project.id]: feedback
                                    }));
                                } else {
                                    console.warn(`No feedback found for project ${project.id}`);
                                }
                            } catch (err) {
                                console.error('Error pre-fetching feedback:', err);
                            }
                        })
                    );
                } else {
                    setError(data.message || 'Failed to fetch projects');
                }
            } catch (err) {
                console.error('Error fetching project statuses:', err);
                setError(t('fetchError'));
            } finally {
                setLoading(false);
            }
        };

        fetchProjectStatuses();
    }, [t]);

    const fetchProjectFeedback = async (projectId) => {
        try {
            const { data: { session } } = await newSupabase.auth.getSession();
            
            if (!session) {
                throw new Error('No session found');
            }

            const res = await fetch(`/api/project-feedback?project_id=${projectId}`, {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                }
            });

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            const data = await res.json();
            if (data.success) {
                return data.feedback;
            }
            return null;
        } catch (err) {
            console.error('Error fetching feedback:', err);
            setError(t('feedbackFetchError'));
            return null;
        }
    };

    const handleProjectClick = async (project) => {
        if (selectedProject?.id === project.id) {
            setIsExpanding(false);
            setTimeout(() => {
                setSelectedProject(null);
            }, 200);
            return;
        }

        setIsExpanding(true);
        setSelectedProject(project);
    };

    const handleEditProject = (projectId) => {
        if (onEditProject) {
            onEditProject(projectId);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleString(i18n.language);
    };

    return (
        <div className="space-y-4">
            <div>
                <p className="app-section-label mb-1">F1</p>
                <h2 className="text-xl font-bold text-white mb-1">{t('projectStatusTitle')}</h2>
                <p className="text-sm text-[#a8b6cc] mb-0">
                    Track submitted work plans linked to your room.
                </p>
            </div>

            {error && (
                <div className="rounded-xl bg-red-500/10 border border-red-400/30 text-red-300 px-3 py-2 text-sm">
                    {error}
                </div>
            )}

            {loading ? (
                <p className="text-sm text-[#a8b6cc]">{t('loading')}</p>
            ) : projects.length > 0 ? (
                <div className="space-y-3">
                    {projects.map((project) => (
                        <div
                            key={project.id}
                            className="rounded-2xl border border-white/10 bg-[#1c2d48] p-4 shadow-soft cursor-pointer hover:border-brand-orange/40 transition-colors"
                            onClick={() => handleProjectClick(project)}
                        >
                            <div className="flex justify-between items-start gap-3">
                                <div className="flex-grow min-w-0">
                                    <h3 className="font-bold text-white text-sm leading-snug">
                                        {project.project_objectives || t('project')}
                                    </h3>
                                    {!project.is_own_room && project.room && (
                                        <p className="text-xs text-[#a8b6cc] mt-1">
                                            {(i18n.language === 'ar' ? project.room.name_ar || project.room.name : project.room.name || project.room.name_ar) || project.room.err_code}
                                            {project.room.state ? ` · ${project.room.state}` : ''}
                                        </p>
                                    )}
                                    <p className="text-sm mt-1.5">
                                        <span className="text-[#8a97ab]">{t('status')}: </span>
                                        <span className={statusColor(project.status)}>
                                            {project.status === 'feedback' ? t('feedbackStatus') : t(project.status)}
                                        </span>
                                    </p>
                                    <p className="text-xs text-[#8a97ab] mt-0.5">
                                        {t('submittedAt')}: {formatDate(project.submitted_at)}
                                    </p>
                                    {project.version > 1 && (
                                        <p className="text-xs text-[#8a97ab]">
                                            {t('version')}: {project.version}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center text-[#8a97ab] shrink-0">
                                    {selectedProject?.id === project.id ? (
                                        <ChevronUpIcon className="h-5 w-5" />
                                    ) : (
                                        <ChevronDownIcon className="h-5 w-5" />
                                    )}
                                </div>
                            </div>
                            
                            <div 
                                className={`transition-all duration-200 ease-in-out overflow-hidden ${
                                    selectedProject?.id === project.id ? 'max-h-[2000px] opacity-100 mt-4' : 'max-h-0 opacity-0'
                                }`}
                            >
                                <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                                    <div className="bg-[#152238] p-3 rounded-xl border border-white/5">
                                        <h4 className="font-semibold mb-2 text-white text-sm">{t('details.basicInfo')}</h4>
                                        <div className="grid grid-cols-1 gap-1.5 text-sm text-[#a8b6cc]">
                                            {project.date && (
                                                <p><span className="text-[#8a97ab]">{t('details.date')}:</span> {formatDate(project.date)}</p>
                                            )}
                                            {(project.state || project.locality) && (
                                                <p><span className="text-[#8a97ab]">{t('details.location')}:</span> {[project.state, project.locality].filter(Boolean).join(', ')}</p>
                                            )}
                                            {project.intended_beneficiaries && (
                                                <p><span className="text-[#8a97ab]">{t('details.intendedBeneficiaries')}:</span> {project.intended_beneficiaries}</p>
                                            )}
                                            {project.estimated_beneficiaries && (
                                                <p><span className="text-[#8a97ab]">{t('details.estimatedBeneficiaries')}:</span> {project.estimated_beneficiaries}</p>
                                            )}
                                            {project.estimated_timeframe && (
                                                <p><span className="text-[#8a97ab]">{t('details.timeframe')}:</span> {project.estimated_timeframe}</p>
                                            )}
                                        </div>
                                    </div>

                                    {project.planned_activities && project.planned_activities.length > 0 && (
                                        <div className="bg-[#152238] p-3 rounded-xl border border-white/5">
                                            <h4 className="font-semibold mb-2 text-white text-sm">{t('details.plannedActivities')}</h4>
                                            <div className="space-y-2">
                                                {project.planned_activities.map((activity, index) => (
                                                    <div key={index} className="border-b border-white/5 pb-2 text-sm text-[#a8b6cc] last:border-0 last:pb-0">
                                                        {activity.activityName && (
                                                            <p><span className="text-[#8a97ab]">{t('details.activity')}:</span> {activity.activityName}</p>
                                                        )}
                                                        {activity.location && (
                                                            <p><span className="text-[#8a97ab]">{t('details.location')}:</span> {activity.location}</p>
                                                        )}
                                                        {activity.quantity && (
                                                            <p><span className="text-[#8a97ab]">{t('details.quantity')}:</span> {activity.quantity}</p>
                                                        )}
                                                        {activity.duration && (
                                                            <p><span className="text-[#8a97ab]">{t('details.duration')}:</span> {activity.duration}</p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {project.additional_support && (
                                        <div className="bg-[#152238] p-3 rounded-xl border border-white/5">
                                            <h4 className="font-semibold mb-2 text-white text-sm">{t('details.additional')}</h4>
                                            <p className="text-sm text-[#a8b6cc]">{project.additional_support}</p>
                                        </div>
                                    )}

                                    {project.status === 'feedback' && feedbackMap[project.id] && feedbackMap[project.id].length > 0 && feedbackMap[project.id][0] && (
                                        <div className="bg-brand-orange/10 p-3 rounded-xl border border-brand-orange/30">
                                            <h4 className="font-semibold mb-2 text-white text-sm">{t('feedback.latest')}</h4>
                                            <p className="mb-2 text-sm text-[#e8eef8]">{feedbackMap[project.id][0].feedback_text}</p>
                                            {feedbackMap[project.id][0].created_by && (
                                                <p className="text-xs text-[#8a97ab]">
                                                    {t('feedback.by')}: {feedbackMap[project.id][0].created_by.full_name || t('feedback.unknown')}
                                                </p>
                                            )}
                                            {feedbackMap[project.id][0].created_at && (
                                                <p className="text-xs text-[#8a97ab]">
                                                    {t('feedback.at')}: {formatDate(feedbackMap[project.id][0].created_at)}
                                                </p>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => handleEditProject(project.id)}
                                                className="mt-3 w-full rounded-xl bg-brand-orange text-[#152238] text-sm font-bold py-2.5 hover:bg-[#ffb88a]"
                                            >
                                                {t('feedback.editProject')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-[#8a97ab]">{t('noProjectsFound')}</p>
            )}

            <button
                type="button"
                onClick={onReturnToMenu}
                className="text-sm font-medium text-[#8a97ab] hover:text-brand-orange px-1 py-2 transition-colors"
            >
                {t('returnToMenu')}
            </button>
        </div>
    );
};

export default ProjectStatus;
