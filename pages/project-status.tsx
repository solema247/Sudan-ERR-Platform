//pages/project-status.tsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import MessageBubble from '../components/MessageBubble';
import Button from '../components/Button';

const ProjectStatus: React.FC = () => {
    const { t, i18n } = useTranslation('projectStatus'); // Use translations for the "project-status" namespace
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProjectStatuses = async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/project-status', { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    setProjects(data.projects);
                } else {
                    console.error('Failed to fetch project statuses');
                }
            } catch (error) {
                console.error('Error fetching project statuses:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProjectStatuses();
    }, []);

    return (
        <div className="space-y-4 p-4">
            <h2 className="text-xl font-bold">{t('projectStatusTitle')}</h2>

            {loading ? (
                <MessageBubble>{t('loading')}</MessageBubble>
            ) : projects.length > 0 ? (
                <div className="space-y-4">
                    {projects.map((project, index) => (
                        <div
                            key={project.id || index}
                            className="p-4 border rounded-lg shadow-md bg-white"
                        >
                            <h3 className="font-bold">{t('project')}: {index + 1}</h3>
                            <p>
                                <strong>{t('state')}:</strong> {project.state}
                            </p>
                            <p>
                                <strong>{t('locality')}:</strong> {project.locality}
                            </p>
                            <p>
                                <strong>{t('status')}:</strong> {t(project.status)}
                            </p>
                            <p>
                                <strong>{t('submittedAt')}:</strong> {new Date(project.submitted_at).toLocaleString(i18n.language)}
                            </p>
                        </div>
                    ))}
                </div>
            ) : (
                <MessageBubble>{t('noProjectsFound')}</MessageBubble>
            )}

            <Button text={t('returnToMenu')} onClick={() => window.history.back()} />
        </div>
    );
};

export default ProjectStatus;
