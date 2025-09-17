//pages/project-status.tsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import MessageBubble from '../components/ui/MessageBubble';
import Button from '../components/ui/Button';
import { newSupabase } from '../services/newSupabaseClient';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface ProjectStatusProps {
    onReturnToMenu: () => void;
    onEditProject?: (projectId: string) => void;
}

const ProjectStatus: React.FC<ProjectStatusProps> = ({ onReturnToMenu, onEditProject }) => {
    const { t, i18n } = useTranslation('projectStatus'); // Use translations for the "project-status" namespace
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
                // Get current session
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
                    
                    // Pre-fetch feedback for all projects with feedback status
                    const feedbackProjects = data.projects.filter(p => p.status === 'feedback');
                    await Promise.all(
                        feedbackProjects.map(async (project) => {
                            try {
                                const feedback = await fetchProjectFeedback(project.id);
                                if (feedback) {
                                    setFeedbackMap(prev => ({
                                        ...prev,
                                        [project.id]: feedback
                                    }));
                                }
                            } catch (error) {
                                console.error('Error pre-fetching feedback:', error);
                            }
                        })
                    );
                } else {
                    setError(data.message || 'Failed to fetch projects');
                }
            } catch (error) {
                console.error('Error fetching project statuses:', error);
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
        } catch (error) {
            console.error('Error fetching feedback:', error);
            setError(t('feedbackFetchError'));
            return null;
        }
    };

    const handleProjectClick = async (project) => {
        // If clicking the same project, collapse it
        if (selectedProject?.id === project.id) {
            setIsExpanding(false);
            setTimeout(() => {
                setSelectedProject(null);
            }, 200); // Match this with the transition duration
            return;
        }

        // Otherwise expand the new project
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
        <div className="space-y-4 p-4">
            {/* Page Title */}
            <h2 className="text-xl font-bold">{t('projectStatusTitle')}</h2>

            {/* Loading Indicator */}
            {loading ? (
                <MessageBubble>{t('loading')}</MessageBubble>
            ) : projects.length > 0 ? (
                <div className="space-y-4">
                    {/* Display Each Project */}
                    {projects.map((project) => (
                        <div
                            key={project.id}
                            className="p-4 border rounded-lg shadow-md bg-white transition-all duration-200 cursor-pointer hover:shadow-lg hover:border-gray-300"
                            onClick={() => handleProjectClick(project)}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex-grow">
                                    <h3 className="font-bold">
                                        {t('project')}: {project.project_objectives}
                                    </h3>
                                    <p>
                                        <strong>{t('status')}:</strong>{' '}
                                        <span className={
                                            project.status === 'active' ? 'text-green-600' : 
                                            project.status === 'pending' ? 'text-orange-500' :
                                            project.status === 'feedback' ? 'text-blue-500' : ''
                                        }>
                                            {project.status === 'feedback' ? t('feedbackStatus') : t(project.status)}
                                        </span>
                                    </p>
                                    <p>
                                        <strong>{t('submittedAt')}:</strong>{' '}
                                        {formatDate(project.submitted_at)}
                                    </p>
                                    <p>
                                        <strong>{t('funding.status')}:</strong>{' '}
                                        <span className="text-gray-700">{t(`funding.${project.funding_status || 'unassigned'}`)}</span>
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {t(`funding.desc.${project.funding_status || 'unassigned'}`)}
                                    </p>
                                    {project.version > 1 && (
                                        <p>
                                            <strong>{t('version')}:</strong> {project.version}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center text-gray-500">
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
                                {/* Project Details Section */}
                                <div className="space-y-4">
                                    {/* Basic Information */}
                                    <div className="bg-gray-50 p-3 rounded-lg">
                                        <h4 className="font-semibold mb-2">{t('details.basicInfo')}</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {project.date && (
                                                <p className="text-sm"><strong>{t('details.date')}:</strong> {formatDate(project.date)}</p>
                                            )}
                                            {(project.state || project.locality) && (
                                                <p className="text-sm"><strong>{t('details.location')}:</strong> {[project.state, project.locality].filter(Boolean).join(', ')}</p>
                                            )}
                                            {project.intended_beneficiaries && (
                                                <p className="text-sm"><strong>{t('details.intendedBeneficiaries')}:</strong> {project.intended_beneficiaries}</p>
                                            )}
                                            {project.estimated_beneficiaries && (
                                                <p className="text-sm"><strong>{t('details.estimatedBeneficiaries')}:</strong> {project.estimated_beneficiaries}</p>
                                            )}
                                            {project.estimated_timeframe && (
                                                <p className="text-sm"><strong>{t('details.timeframe')}:</strong> {project.estimated_timeframe}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Activities Section */}
                                    {project.planned_activities && project.planned_activities.length > 0 && (
                                        <div className="bg-gray-50 p-3 rounded-lg mt-2">
                                            <h4 className="font-semibold mb-2">{t('details.plannedActivities')}</h4>
                                            <div className="space-y-2">
                                                {project.planned_activities.map((activity, index) => (
                                                    <div key={index} className="border-b pb-1 text-sm">
                                                        {activity.activityName && (
                                                            <p><strong>{t('details.activity')}:</strong> {activity.activityName}</p>
                                                        )}
                                                        {activity.location && (
                                                            <p><strong>{t('details.location')}:</strong> {activity.location}</p>
                                                        )}
                                                        {activity.quantity && (
                                                            <p><strong>{t('details.quantity')}:</strong> {activity.quantity}</p>
                                                        )}
                                                        {activity.duration && (
                                                            <p><strong>{t('details.duration')}:</strong> {activity.duration}</p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Additional Support */}
                                    {project.additional_support && (
                                        <div className="bg-gray-50 p-3 rounded-lg mt-2">
                                            <h4 className="font-semibold mb-2">{t('details.additional')}</h4>
                                            <p className="text-sm"><strong>{t('details.additionalSupport')}:</strong> {project.additional_support}</p>
                                        </div>
                                    )}

                                    {/* Feedback Section (if available) */}
                                    {project.status === 'feedback' && feedbackMap[project.id] && (
                                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mt-2">
                                            <h4 className="font-semibold mb-2">{t('feedback.latest')}</h4>
                                            <p className="mb-2 text-sm">{feedbackMap[project.id][0].feedback_text}</p>
                                            <p className="text-xs text-gray-600">
                                                {t('feedback.by')}: {feedbackMap[project.id][0].created_by.full_name}
                                            </p>
                                            <p className="text-xs text-gray-600">
                                                {t('feedback.at')}: {formatDate(feedbackMap[project.id][0].created_at)}
                                            </p>
                                            <div className="mt-2">
                                                <Button
                                                    text={t('feedback.editProject')}
                                                    onClick={() => handleEditProject(project.id)}
                                                    className="w-full"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <MessageBubble>{t('noProjectsFound')}</MessageBubble>
            )}

            {/* Return to Menu Button */}
            <Button text={t('returnToMenu')} onClick={onReturnToMenu} />
        </div>
    );
};

export default ProjectStatus;


