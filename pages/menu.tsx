// /pages/menu.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import ChatContainer from '../components/ui/ChatContainer';
import MessageBubble from '../components/ui/MessageBubble';
import Button from '../components/ui/Button';
import FillForm from '../pages/fill-form';
import ScanForm from '../pages/scan-form';
import ScanCustomForm from '../pages/scan-custom-form'; // Import the new component
import ProjectApplication from '../components/forms/NewProject';
import ProjectStatus from '../pages/project-status';
import FeedbackForm from '../components/forms/FeedbackForm'; // Correct import path
const LogoImage = '/icons/icon-512x512.png'; 


const getCurrentTimestamp = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const Menu = () => {
    const [currentMenu, setCurrentMenu] = useState('main'); // Tracks the current menu
    const [showFillForm, setShowFillForm] = useState(false);
    const [showScanForm, setShowScanForm] = useState(false);
    const [showScanCustomForm, setShowScanCustomForm] = useState(false);
    const [showProjectApplication, setShowProjectApplication] = useState(false);
    const [showProjectStatus, setShowProjectStatus] = useState(false);
    const [projects, setProjects] = useState([]); // Stores active projects
    const [selectedProject, setSelectedProject] = useState(null); // Stores selected project

    const router = useRouter();
    const { t, i18n } = useTranslation('menu');

    // Validate session on load
    useEffect(() => {
        const checkAuth = async () => {
            const response = await fetch('/api/validate-session', { credentials: 'include' });
            if (!response.ok) {
                router.push('/login'); // Redirect to login if session is invalid
            }
        };

        checkAuth();
    }, [router]);

    // Fetch active projects when 'reporting' menu is selected
    useEffect(() => {
        if (currentMenu === 'reporting') {
            const fetchProjects = async () => {
                try {
                    const response = await fetch('/api/get-projects', { credentials: 'include' });
                    const data = await response.json();
                    if (data.success) {
                        setProjects(data.projects);
                    } else {
                        console.error('Error fetching projects:', data.message);
                    }
                } catch (error) {
                    console.error('Unexpected error fetching projects:', error);
                }
            };

            fetchProjects();
        }
    }, [currentMenu]);

    // Update direction and language attributes dynamically
    useEffect(() => {
        const direction = i18n.language === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.setAttribute('dir', direction);
        document.documentElement.setAttribute('lang', i18n.language);
    }, [i18n.language]);

    // Menu selection handler
    const handleMenuSelection = (menu: string) => {
        setCurrentMenu(menu);
        setShowFillForm(false);
        setShowScanForm(false);
        setShowScanCustomForm(false);
        setShowProjectApplication(false);
        setShowProjectStatus(false);
        setSelectedProject(null); // Reset selected project when navigating away
    };

    // Workflow selection handler
    const handleWorkflowSelection = (workflow: string) => {
        setShowFillForm(false);
        setShowScanForm(false);
        setShowScanCustomForm(false);
        setShowProjectApplication(false);
        setShowProjectStatus(false);

        if (workflow === 'fill-form') setShowFillForm(true);
        if (workflow === 'scan-form') setShowScanForm(true);
        if (workflow === 'scan-custom-form') setShowScanCustomForm(true);
        if (workflow === 'project-application') setShowProjectApplication(true);
        if (workflow === 'project-status') setShowProjectStatus(true);
    };

    return (
        <ChatContainer>
            {/* Language Switcher */}
            <div className="flex justify-center items-center mb-4 space-x-4">
                <button onClick={() => i18n.changeLanguage('en')} className="mx-2 text-blue-500 hover:underline">
                    English
                </button>
                <button onClick={() => i18n.changeLanguage('ar')} className="mx-2 text-blue-500 hover:underline">
                    العربية
                </button>
                {/*<button onClick={() => i18n.changeLanguage('es')} className="mx-2 text-blue-500 hover:underline">
                    Español
                </button>*/}
            </div>

            {/* Main Menu */}
            {currentMenu === 'main' && (
                <>
                    <div className="flex items-center mb-4 space-x-4">
                        <img
                            src={LogoImage} // Public path
                            alt={t('logoAlt')}
                            width={80}
                            height={80}
                            className="rounded"
                        />
                        <div className="text-left font-bold text-lg">
                            {t('welcomeMessage')}
                        </div>
                    </div>
                    <MessageBubble
                        text={t('introMessage')}
                        timestamp={getCurrentTimestamp()}
                        fullWidth
                    />
                    <MessageBubble
                        text={t('chooseMainMenu')}
                        timestamp={getCurrentTimestamp()}
                        fullWidth
                    />
                    <div className="grid grid-cols-1 space-y-2">
                        <Button text={t('projects')} onClick={() => handleMenuSelection('projects')} className="w-full" />
                        <Button text={t('reporting')} onClick={() => handleMenuSelection('reporting')} className="w-full" />
                        <Button text={t('feedback')} onClick={() => setCurrentMenu('feedback')} className="w-full" />
                        <Button text={t('exitChat')} onClick={() => router.push('/login')} className="w-full" />
                    </div>
                </>
            )}

            {/* Add this new block for the 'projects' menu */}
            {currentMenu === 'projects' && (
                <>
                    <MessageBubble
                        text={t('projectsInstructions')}
                        timestamp={getCurrentTimestamp()}
                        fullWidth
                    />
                    <div className="grid grid-cols-1 space-y-2">
                        <Button
                            text={t('projectApplication')}
                            onClick={() => handleWorkflowSelection('project-application')}
                            className="w-full"
                        />
                        <Button
                            text={t('projectStatus')}
                            onClick={() => handleWorkflowSelection('project-status')}
                            className="w-full"
                        />
                        <Button
                            text={t('returnToMainMenu')}
                            onClick={() => handleMenuSelection('main')}
                            className="w-full"
                        />
                    </div>
                </>
            )}

            {/* Project Selection for Reporting */}
            {currentMenu === 'reporting' && !selectedProject && (
                <>
                    <MessageBubble
                        text={t('selectProject')}
                        timestamp={getCurrentTimestamp()}
                        fullWidth
                    />
                    <div className="grid grid-cols-1 space-y-2">
                        {projects.map((project: any) => (
                            <Button
                                key={project.id}
                                text={`${project.project_objectives} (${project.locality})`}
                                onClick={() => setSelectedProject(project)}
                                className="w-full"
                            />
                        ))}
                        <Button text={t('returnToMainMenu')} onClick={() => handleMenuSelection('main')} className="w-full" />
                    </div>
                </>
            )}

            {/* Reporting Menu for Selected Project */}
            {currentMenu === 'reporting' && selectedProject && (
                <>
                    <MessageBubble
                        text={t('reportingInstructions', { project: selectedProject.project_objectives })}
                        timestamp={getCurrentTimestamp()}
                        fullWidth
                    />
                    <div className="grid grid-cols-1 space-y-2">
                        <Button
                            text={t('reportFillForm')}
                            onClick={() => handleWorkflowSelection('fill-form')}
                            className="w-full"
                        />
                        <Button
                            text={t('reportScanForm')}
                            onClick={() => handleWorkflowSelection('scan-form')}
                            className="w-full"
                        />
                        <Button
                            text={t('reportScanCustomForm')}
                            onClick={() => handleWorkflowSelection('scan-custom-form')}
                            className="w-full"
                        />
                        <Button text={t('selectDifferentProject')} onClick={() => setSelectedProject(null)} className="w-full" />
                        <Button text={t('returnToMainMenu')} onClick={() => handleMenuSelection('main')} className="w-full" />
                    </div>
                </>
            )}

            {/* Other workflows */}
            {showFillForm && (
                <MessageBubble>
                    <FillForm 
                        project={selectedProject} 
                        onReturnToMenu={() => handleMenuSelection('reporting')} 
                        onSubmitAnotherForm={() => {
                            setShowFillForm(false);
                            setTimeout(() => setShowFillForm(true), 0); // Reset workflow
                        }}
                    />
                </MessageBubble>
            )}

            {showScanForm && (
                <MessageBubble>
                    <ScanForm project={selectedProject} onReturnToMenu={() => handleMenuSelection('reporting')} />
                </MessageBubble>
            )}

            {showScanCustomForm && (
                <MessageBubble>
                    <ScanCustomForm
                        project={selectedProject}
                        onReturnToMenu={() => handleMenuSelection('reporting')}
                        onSubmitAnotherForm={() => {
                            setShowScanCustomForm(false);
                            setTimeout(() => setShowScanCustomForm(true), 0); // Reset workflow
                        }}
                    />
                </MessageBubble>
            )}

            {showProjectApplication && (
                <MessageBubble>
                    <ProjectApplication onReturnToMenu={() => handleMenuSelection('projects')} />
                </MessageBubble>
            )}

            {showProjectStatus && (
                <MessageBubble>
                    <ProjectStatus onReturnToMenu={() => handleMenuSelection('main')} />
                </MessageBubble>
            )}

            {/* Feedback Menu */}
            {currentMenu === 'feedback' && (
                <>
                    <MessageBubble
                        text={t('feedbackInstructions')}
                        timestamp={getCurrentTimestamp()}
                        fullWidth
                    />
                    <div className="grid grid-cols-1 space-y-2">
                        <Button
                            text={t('appFeedback')}
                            onClick={() => setCurrentMenu('appFeedback')}
                            className="w-full"
                        />
                        <Button
                            text={t('returnToMainMenu')}
                            onClick={() => handleMenuSelection('main')}
                            className="w-full"
                        />
                    </div>
                </>
            )}

            {/* Feedback Form */}
            {currentMenu === 'appFeedback' && (
                <MessageBubble>
                    <FeedbackForm onReturnToMenu={() => handleMenuSelection('feedback')} />
                </MessageBubble>
            )}
        </ChatContainer>
    );
};

export default Menu;
