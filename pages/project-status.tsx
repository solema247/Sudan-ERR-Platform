//pages/project-status.tsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import MessageBubble from '../components/ui/MessageBubble';
import Button from '../components/ui/Button';
import { newSupabase } from '../services/newSupabaseClient';

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
    const [projectFeedback, setProjectFeedback] = useState(null);

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
                setProjectFeedback(data.feedback);
            }
        } catch (error) {
            console.error('Error fetching feedback:', error);
            setError(t('feedbackFetchError'));
        }
    };

    const handleProjectClick = async (project) => {
        setSelectedProject(project);
        if (project.status === 'feedback') {
            await fetchProjectFeedback(project.id);
        }
    };

    const handleEditProject = (projectId) => {
        if (onEditProject) {
            onEditProject(projectId);
        }
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
                            className="p-4 border rounded-lg shadow-md bg-white"
                            onClick={() => handleProjectClick(project)}
                        >
                            <h3 className="font-bold">
                                {t('project')}: {project.title}
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
                                {new Date(project.submitted_at).toLocaleString(i18n.language)}
                            </p>
                            {project.version > 1 && (
                                <p>
                                    <strong>{t('version')}:</strong> {project.version}
                                </p>
                            )}
                            
                            {selectedProject?.id === project.id && project.status === 'feedback' && projectFeedback && (
                                <div className="mt-4 p-3 bg-blue-50 rounded">
                                    <h4 className="font-semibold mb-2">{t('feedback.latest')}</h4>
                                    <p className="mb-2">{projectFeedback[0].feedback_text}</p>
                                    <p className="text-sm text-gray-600">
                                        {t('feedback.by')}: {projectFeedback[0].created_by.full_name}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        {t('feedback.at')}: {new Date(projectFeedback[0].created_at).toLocaleString(i18n.language)}
                                    </p>
                                    <div className="mt-3">
                                        <Button
                                            text={t('feedback.editProject')}
                                            onClick={() => handleEditProject(project.id)}
                                            className="w-full"
                                        />
                                    </div>
                                </div>
                            )}
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


