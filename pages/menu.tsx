import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import ChatContainer from '../components/ui/ChatContainer';
import MessageBubble from '../components/ui/MessageBubble';
import Button from '../components/ui/Button';
import ReportingForm from '../components/forms/ReportForm/ReportingForm';
import ScanForm from './scan-form';
import ScanCustomForm from './scan-custom-form'; // Import the new component
import ProjectApplication from '../components/forms/NewProjectForm/NewProjectForm';
import ProjectStatus from './project-status';
import FeedbackForm from '../components/forms/FeedbackForm'; // Correct import path
import ScanPrefillForm from '../pages/scan-prefill-form';
const LogoImage = '/icons/icon-512x512.png'; 
import Project from '../components/forms/NewProjectForm/Project';

/**
 * Chat-style menu.
 * 
*/

enum Workflow {
    FILL_FORM,
    SCAN_FORM,
    SCAN_CUSTOM_FORM,
    PROJECT_APPLICATION,
    PROJECT_STATUS
}

enum CurrentMenu {
    MAIN,
    REPORTING,
    FEEDBACK,
    PROJECTS
}


const getCurrentTimestamp = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};


const Menu = () => {
    const [currentMenu, setCurrentMenu] = useState(CurrentMenu.MAIN);
    const [showFillForm, setShowFillForm] = useState(false);
    const [showScanForm, setShowScanForm] = useState(false);
    const [showScanCustomForm, setShowScanCustomForm] = useState(false);
    const [showProjectApplication, setShowProjectApplication] = useState(false);
    const [showProjectStatus, setShowProjectStatus] = useState(false);
    const [projects, setProjects] = useState<Project[]>([]); // Stores active projects
    const [selectedProject, setSelectedProject] = useState<Project | null>(null); // Stores selected project
    const [activeReportId, setActiveReportId] = useState(null)
    const [showScanPrefillForm, setShowScanPrefillForm] = useState(false);

    const router = useRouter();
    const errId = router.query.errId;
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
        if (currentMenu === CurrentMenu.REPORTING) {
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

    const createNewReportId = () => {
        setActiveReportId(crypto.randomUUID());
    }
    

    // Update direction and language attributes dynamically
    useEffect(() => {
        const direction = i18n.language === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.setAttribute('dir', direction);
        document.documentElement.setAttribute('lang', i18n.language);
    }, [i18n.language]);

    // Menu selection handler
    const handleMenuSelection = (menu: CurrentMenu) => {
        setCurrentMenu(menu);
        setShowFillForm(false);
        setShowScanForm(false);
        setShowScanCustomForm(false);
        setShowProjectApplication(false);
        setShowProjectStatus(false);
        setShowScanPrefillForm(false);
        setSelectedProject(null); // Reset selected project when navigating away
    };

    // Workflow selection handler

    const handleWorkflowSelection = (workflow: Workflow) => {
        setShowFillForm(false);
        setShowScanForm(false);
        setShowScanCustomForm(false);
        setShowProjectApplication(false);
        setShowProjectStatus(false);
        setShowScanPrefillForm(false);

        if (workflow === Workflow.FILL_FORM) {
            createNewReportId();
            setShowFillForm(true);
        }
        if (workflow === Workflow.SCAN_FORM) setShowScanForm(true);
        if (workflow === Workflow.SCAN_CUSTOM_FORM) setShowScanCustomForm(true);
        if (workflow === Workflow.PROJECT_APPLICATION) setShowProjectApplication(true);
        if (workflow === Workflow.PROJECT_STATUS) setShowProjectStatus(true);
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
            {currentMenu === CurrentMenu.MAIN && (
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
                    <div className="grid grid-cols-1 space-y-3">
                        <Button text={t('projects')} onClick={() => handleMenuSelection(CurrentMenu.PROJECTS)} />
                        <Button text={t('reporting')} onClick={() => handleMenuSelection(CurrentMenu.REPORTING)} className="w-full" />
                        <Button text={t('feedback')} onClick={() => setCurrentMenu(CurrentMenu.FEEDBACK)} className="w-full" />
                        <Button text={t('exitChat')} onClick={() => router.push('/login')} className="w-full" />
                    </div>
                </>
            )}

            {/* Add this new block for the 'projects' menu */}
            {currentMenu === CurrentMenu.PROJECTS && (
                <>
                    <MessageBubble
                        text={t('projectsInstructions')}
                        timestamp={getCurrentTimestamp()}
                        fullWidth
                    />
                    <div className="grid grid-cols-1 space-y-2">
                        <Button
                            text={t('projectApplication')}
                            onClick={() => handleWorkflowSelection(Workflow.PROJECT_APPLICATION)}
                            className="w-full"
                        />
                        <Button
                            text={t('projectStatus')}
                            onClick={() => handleWorkflowSelection(Workflow.PROJECT_STATUS)}
                            className="w-full"
                        />
                        <Button
                            text={t('returnToMainMenu')}
                            onClick={() => handleMenuSelection(CurrentMenu.MAIN)}
                            className="w-full"
                        />
                    </div>
                </>
            )}

            {/* Project Selection for Reporting */}
            {currentMenu === CurrentMenu.REPORTING && !selectedProject && (
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
                        <Button text={t('returnToMainMenu')} onClick={() => handleMenuSelection(CurrentMenu.MAIN)} className="w-full" />
                    </div>
                </>
            )}

            {/* Reporting Menu for Selected Project */}
            {currentMenu === CurrentMenu.REPORTING && selectedProject && (
                <>
                    <MessageBubble
                        text={t('reportingInstructions', { project: selectedProject.project_objectives })}
                        timestamp={getCurrentTimestamp()}
                        fullWidth
                    />
                    <div className="grid grid-cols-1 space-y-2">
                        <Button
                            text={t('reportFillForm')}
                            onClick={() => handleWorkflowSelection(Workflow.FILL_FORM)}
                            className="w-full"
                        />
                        <Button
                            text={t('reportScanForm')}
                            onClick={() => handleWorkflowSelection(Workflow.SCAN_FORM)}
                            className="w-full"
                        />
                        <Button
                            text={t('reportScanCustomForm')}
                            onClick={() => handleWorkflowSelection(Workflow.SCAN_CUSTOM_FORM)}
                            className="w-full"
                        />
                        <Button text={t('selectDifferentProject')} onClick={() => setSelectedProject(null)} className="w-full" />
                        <Button text={t('returnToMainMenu')} onClick={() => handleMenuSelection(CurrentMenu.MAIN)} className="w-full" />
                    </div>
                </>
            )}

            {/* Other workflows */}
            {showFillForm && (
                <MessageBubble>
                    <ReportingForm
                        errId={errId as string}
                        reportId={activeReportId}
                        project={selectedProject} 
                        onReturnToMenu={() => handleMenuSelection(CurrentMenu.REPORTING)} 
                        onSubmitAnotherForm={() => {
                            setShowFillForm(false);
                            createNewReportId();
                            setTimeout(() => setShowFillForm(true), 0); // Reset workflow
                        }}
                    />
                </MessageBubble>
            )}

            {showScanForm && (
                <MessageBubble>
                    <ScanForm project={selectedProject} onReturnToMenu={() => handleMenuSelection(CurrentMenu.REPORTING)} />
                </MessageBubble>
            )}

            {showScanCustomForm && (
                <MessageBubble>
                    <ScanCustomForm
                        project={selectedProject}
                        onReturnToMenu={() => handleMenuSelection(CurrentMenu.REPORTING)}
                        onSubmitAnotherForm={() => {
                            setShowScanCustomForm(false);
                            setTimeout(() => setShowScanCustomForm(true), 0); // Reset workflow
                        }}
                    />
                </MessageBubble>
            )}

            {showProjectApplication && (
                <MessageBubble>
                    <ProjectApplication onReturnToMenu={() => handleMenuSelection(CurrentMenu.PROJECTS)} />
                </MessageBubble>
            )}

            {showProjectStatus && (
                <MessageBubble>
                    <ProjectStatus onReturnToMenu={() => handleMenuSelection(CurrentMenu.MAIN)} />
                </MessageBubble>
            )}

            {/* Feedback Menu */}
            {currentMenu === CurrentMenu.FEEDBACK && (
                <>
                    <MessageBubble
                        text={t('feedbackInstructions')}
                        timestamp={getCurrentTimestamp()}
                        fullWidth
                    />
                    <div className="grid grid-cols-1 space-y-2">
                        <Button
                            text={t('appFeedback')}
                            onClick={() => setCurrentMenu(CurrentMenu.FEEDBACK)}
                            className="w-full"
                        />
                        <Button
                            text={t('returnToMainMenu')}
                            onClick={() => handleMenuSelection(CurrentMenu.MAIN)}
                            className="w-full"
                        />
                    </div>
                </>
            )}

            {/* Feedback Form */}
            {currentMenu === CurrentMenu.FEEDBACK && (
                <MessageBubble>
                    <FeedbackForm onReturnToMenu={() => handleMenuSelection(CurrentMenu.FEEDBACK)} />
                </MessageBubble>
            )}

            {/* Scan Prefill Form */}
            {showScanPrefillForm && (
                <MessageBubble>
                    <ScanPrefillForm project={selectedProject} />
                </MessageBubble>
            )}
        </ChatContainer>
    );
};

export default Menu;
