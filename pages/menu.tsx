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
import ProgramReportForm from '../components/forms/ProgramReportForm/ReportingForm';
import ProjectDrafts from '../components/forms/NewProjectForm/ProjectDrafts';
import FundingCycleSelection from '../components/forms/NewProjectForm/FundingCycleSelection';
import FinancialReportDrafts from '../components/forms/FinancialReportForm/FinancialReportDrafts';
import ProgramReportDrafts from '../components/forms/ProgramReportForm/ProgramReportDrafts';
import { newSupabase } from '../services/newSupabaseClient';

/**
 * Chat-style menu.
 * 
*/

enum Workflow {
    FILL_FORM,
    SCAN_FORM,
    SCAN_CUSTOM_FORM,
    PROJECT_APPLICATION,
    PROJECT_STATUS,
    PROGRAM_FORM
}

enum CurrentMenu {
    MAIN,
    REPORTING,
    FEEDBACK,
    PROJECTS
}

// Add this interface near the top of the file with other interfaces
interface ProgramReportDraft {
    id: string;
    report_date: string;
    positive_changes: string;
    negative_results: string;
    unexpected_results: string;
    lessons_learned: string;
    suggestions: string;
    reporting_person: string;
    activities: Array<{
        id: string;
        activity_name: string;
        activity_goal: string;
        location: string;
        start_date: string;
        end_date: string;
        individual_count: number;
        household_count: number;
        male_count: number;
        female_count: number;
        under18_male: number;
        under18_female: number;
    }>;
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
    const [showProgramForm, setShowProgramForm] = useState(false);  // Add new state
    const [projects, setProjects] = useState<Project[]>([]); // Stores active projects
    const [selectedProject, setSelectedProject] = useState<Project | null>(null); // Stores selected project
    const [activeReportId, setActiveReportId] = useState(null)
    const [showScanPrefillForm, setShowScanPrefillForm] = useState(false);
    const [showProjectDrafts, setShowProjectDrafts] = useState(false);
    const [showFundingCycleSelection, setShowFundingCycleSelection] = useState(false);
    const [selectedFundingCycle, setSelectedFundingCycle] = useState(null);
    const [drafts, setDrafts] = useState<Project[]>([]);
    const [showDraftList, setShowDraftList] = useState(true);
    const [currentProjectDraft, setCurrentProjectDraft] = useState<Project | null>(null);
    const [currentProgramDraft, setCurrentProgramDraft] = useState<ProgramReportDraft | null>(null);
    const [showFinancialDrafts, setShowFinancialDrafts] = useState(false);
    const [financialDrafts, setFinancialDrafts] = useState([]);
    const [programDrafts, setProgramDrafts] = useState([]);
    const [projectToEdit, setProjectToEdit] = useState(null);

    const router = useRouter();
    const errId = router.query.errId;
    const { t, i18n } = useTranslation('menu');

    // Validate session on load
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { data: { session } } = await newSupabase.auth.getSession();
                
                if (!session) {
                    router.push('/login');
                    return;
                }

                const response = await fetch('/api/validate-session', { 
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    }
                });
                
                if (!response.ok) {
                    console.log('Auth check failed:', await response.text());
                    router.push('/login');
                    return;
                }

                const data = await response.json();
                if (!data.success) {
                    console.log('Auth check failed:', data.message);
                    router.push('/login');
                }
            } catch (error) {
                console.error('Auth check error:', error);
                router.push('/login');
            }
        };

        checkAuth();
    }, [router]);

    // Fetch active projects when 'reporting' menu is selected
    useEffect(() => {
        if (currentMenu === CurrentMenu.REPORTING) {
            const fetchProjects = async () => {
                try {
                    // Get current session
                    const { data: { session } } = await newSupabase.auth.getSession();
                    
                    if (!session) {
                        throw new Error('No active session');
                    }

                    const response = await fetch('/api/get-projects', {
                        credentials: 'include',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.access_token}`
                        }
                    });
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

    // Add useEffect to fetch drafts
    useEffect(() => {
        const fetchDrafts = async () => {
            try {
                // Get current session
                const { data: { session } } = await newSupabase.auth.getSession();
                
                if (!session) {
                    console.error('No active session');
                    return;
                }

                // Fetch financial report drafts
                const financialResponse = await fetch(
                    `/api/financial-report-drafts?project_id=${selectedProject.id}`, 
                    {
                        credentials: 'include',
                        headers: {
                            'Authorization': `Bearer ${session.access_token}`
                        }
                    }
                );

                if (!financialResponse.ok) {
                    throw new Error('Failed to fetch financial drafts');
                }

                const financialData = await financialResponse.json();

                // Fetch program report drafts
                const programResponse = await fetch(
                    `/api/program-report-drafts?project_id=${selectedProject.id}`, 
                    {
                        credentials: 'include',
                        headers: {
                            'Authorization': `Bearer ${session.access_token}`
                        }
                    }
                );

                if (!programResponse.ok) {
                    throw new Error('Failed to fetch program drafts');
                }

                const programData = await programResponse.json();

                setFinancialDrafts(financialData.drafts || []);
                setProgramDrafts(programData.drafts || []);
            } catch (error) {
                console.error('Error fetching drafts:', error);
            }
        };

        if (showFinancialDrafts && selectedProject) {
            fetchDrafts();
        }
    }, [showFinancialDrafts, selectedProject]);

    // Add this useEffect after the other useEffects
    const fetchProjectDrafts = async () => {
        try {
            // Get current session
            const { data: { session } } = await newSupabase.auth.getSession();
            
            if (!session) {
                console.error('No active session');
                router.push('/login');
                return;
            }

            const response = await fetch('/api/project-drafts', {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                setDrafts(data.drafts || []);
            } else {
                console.error('Error fetching project drafts:', data.message);
            }
        } catch (error) {
            console.error('Error fetching project drafts:', error);
        }
    };

    useEffect(() => {
        if (showProjectDrafts) {
            fetchProjectDrafts();
        }
    }, [showProjectDrafts, router]);

    const createNewReportId = () => {
        setActiveReportId(crypto.randomUUID());
    }
    

    // Update direction and language attributes dynamically
    useEffect(() => {
        const direction = i18n.language === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.setAttribute('dir', direction);
        document.documentElement.setAttribute('lang', i18n.language);
    }, [i18n.language]);

    // Create a function to reset all form states
    const resetFormStates = () => {
        setShowFillForm(false);
        setShowScanForm(false);
        setShowScanCustomForm(false);
        setShowProjectApplication(false);
        setShowProjectStatus(false);
        setShowProgramForm(false);
        setShowScanPrefillForm(false);
        setShowFinancialDrafts(false);
        setShowProjectDrafts(false);
        setShowFundingCycleSelection(false);
        setSelectedFundingCycle(null);
        setCurrentProgramDraft(null);
        setCurrentProjectDraft(null);
    };

    // Menu selection handler
    const handleMenuSelection = (menu: CurrentMenu) => {
        resetFormStates(); // Reset all form states first
        setCurrentMenu(menu);
        setShowDraftList(true); // Reset draft list view
        setSelectedProject(null);
    };

    // Workflow selection handler
    const handleWorkflowSelection = (workflow: Workflow) => {
        resetFormStates(); // Reset all form states first

        if (workflow === Workflow.FILL_FORM) {
            createNewReportId();
            setShowFillForm(true);
        }
        if (workflow === Workflow.SCAN_FORM) setShowScanForm(true);
        if (workflow === Workflow.SCAN_CUSTOM_FORM) setShowScanCustomForm(true);
        if (workflow === Workflow.PROJECT_APPLICATION) {
            setShowFundingCycleSelection(true);
        }
        if (workflow === Workflow.PROJECT_STATUS) {
            setShowProjectStatus(true);
            setProjectToEdit(null);
        }
        if (workflow === Workflow.PROGRAM_FORM) setShowProgramForm(true);
    };

    const onEditDraft = async (draftId) => {
        try {
            // Get current session
            const { data: { session } } = await newSupabase.auth.getSession();
            
            if (!session) {
                throw new Error('No active session');
            }

            const response = await fetch(
                `/api/financial-report-drafts?draft_id=${draftId}&project_id=${selectedProject.id}`,
                {
                    credentials: 'include',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch draft');
            }

            const { draft } = await response.json();
            setCurrentProjectDraft(draft);
            setShowFinancialDrafts(false);
            setShowFillForm(true);
        } catch (error) {
            console.error('Error loading draft:', error);
            alert(t('drafts.loadError'));
        }
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
                    <MessageBubble text={t('selectReportType')} />
                    <div className="grid grid-cols-1 gap-2">
                        <Button
                            text={t('reportFillForm')}
                            onClick={() => {
                                resetFormStates();
                                createNewReportId();
                                setShowFillForm(true);
                            }}
                            className="w-full"
                        />
                        <Button
                            text={t('reportScanForm')}
                            onClick={() => {
                                resetFormStates();
                                setShowScanForm(true);
                            }}
                            className="w-full"
                        />
                        <Button
                            text={t('reportProgramForm')}
                            onClick={() => {
                                resetFormStates();
                                setShowProgramForm(true);
                            }}
                            className="w-full"
                        />
                        <Button
                            text={t('viewDrafts')}
                            onClick={() => {
                                resetFormStates();
                                setShowFinancialDrafts(true);
                                setCurrentProgramDraft(null);
                            }}
                            className="w-full"
                        />
                        <Button
                            text={t('selectDifferentProject')}
                            onClick={() => {
                                resetFormStates();
                                setSelectedProject(null);
                            }}
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

            {/* Other workflows */}
            {showFillForm && (
                <MessageBubble>
                    <ReportingForm
                        errId={errId as string}
                        reportId={activeReportId}
                        project={selectedProject} 
                        onReturnToMenu={() => {
                            resetFormStates();
                            handleMenuSelection(CurrentMenu.REPORTING);
                        }}
                        onSubmitAnotherForm={() => {
                            resetFormStates();
                            createNewReportId();
                            setShowFillForm(true);
                        }}
                        initialDraft={currentProjectDraft}
                    />
                </MessageBubble>
            )}

            {showScanForm && (
                <MessageBubble>
                    <ScanForm 
                        project={selectedProject} 
                        onReturnToMenu={() => {
                            resetFormStates();
                            handleMenuSelection(CurrentMenu.REPORTING);
                        }}
                    />
                </MessageBubble>
            )}

            {showScanCustomForm && (
                <MessageBubble>
                    <ScanCustomForm
                        project={selectedProject}
                        onReturnToMenu={() => {
                            resetFormStates();
                            handleMenuSelection(CurrentMenu.REPORTING);
                        }}
                        onSubmitAnotherForm={() => {
                            resetFormStates();
                            setShowScanCustomForm(true);
                        }}
                    />
                </MessageBubble>
            )}

            {showFundingCycleSelection && (
                <MessageBubble>
                    <FundingCycleSelection
                        onSelectFundingCycle={(cycle) => {
                            setSelectedFundingCycle(cycle);
                            setShowFundingCycleSelection(false);
                            setShowProjectApplication(true);
                            setShowProjectDrafts(true);
                            setShowDraftList(true);
                        }}
                        onReturnToMenu={() => handleMenuSelection(CurrentMenu.PROJECTS)}
                    />
                </MessageBubble>
            )}

            {showProjectApplication && (
                <MessageBubble>
                    {showDraftList && !projectToEdit ? (
                        <ProjectDrafts
                            drafts={drafts.map(draft => ({
                                ...draft,
                                last_modified: draft.last_modified || new Date().toISOString()
                            }))}
                            onEditDraft={(draftId) => {
                                const draftToEdit = drafts.find(d => d.id === draftId);
                                setCurrentProjectDraft(draftToEdit);
                                setShowDraftList(false);
                            }}
                            onDeleteDraft={(draftId) => {
                                setDrafts(drafts.filter(d => d.id !== draftId));
                            }}
                            onNewProject={() => {
                                setCurrentProjectDraft(null);
                                setShowDraftList(false);
                            }}
                            onReturnToMenu={() => handleMenuSelection(CurrentMenu.PROJECTS)}
                        />
                    ) : (
                        <ProjectApplication 
                            onReturnToMenu={() => {
                                if (projectToEdit) {
                                    setShowProjectApplication(false);
                                    setShowProjectStatus(true);
                                    setProjectToEdit(null);
                                } else {
                                    setShowDraftList(true);
                                }
                            }}
                            initialValues={currentProjectDraft}
                            projectToEdit={projectToEdit}
                            selectedFundingCycle={selectedFundingCycle}
                            onDraftSubmitted={() => {
                                if (currentProjectDraft) {
                                    setDrafts(drafts.filter(d => d.id !== currentProjectDraft.id));
                                }
                                setShowDraftList(true);
                                setProjectToEdit(null);
                                // Refresh drafts list
                                fetchProjectDrafts();
                            }}
                        />
                    )}
                </MessageBubble>
            )}

            {showProjectStatus && (
                <MessageBubble>
                    <ProjectStatus 
                        onReturnToMenu={() => handleMenuSelection(CurrentMenu.MAIN)} 
                        onEditProject={(projectId) => {
                            setProjectToEdit(projectId);
                            setShowProjectStatus(false);
                            setShowProjectApplication(true);
                            setShowDraftList(false); // Skip the drafts list
                        }}
                    />
                </MessageBubble>
            )}

            {showProgramForm && (
                <MessageBubble>
                    <ProgramReportForm
                        project={selectedProject}
                        onReturnToMenu={() => {
                            resetFormStates();
                            handleMenuSelection(CurrentMenu.REPORTING);
                        }}
                        onSubmitAnotherForm={() => {
                            resetFormStates();
                            setShowProgramForm(true);
                        }}
                        initialDraft={currentProgramDraft}
                    />
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
                    <FeedbackForm onReturnToMenu={() => {
                        console.log('Menu component: Returning to main menu');  // Debug log
                        handleMenuSelection(CurrentMenu.MAIN);  // Make sure we're using this
                    }} />
                </MessageBubble>
            )}

            {/* Scan Prefill Form */}
            {showScanPrefillForm && (
                <MessageBubble>
                    <ScanPrefillForm project={selectedProject} />
                </MessageBubble>
            )}

            {/* Add drafts view section */}
            {showFinancialDrafts && (
                <div className="space-y-4">
                    {/* Financial Report Drafts */}
                    <div className="mb-6">
                        <h3 className="text-xl font-bold mb-4">{t('financial.draftsTitle')}</h3>
                        <FinancialReportDrafts
                            drafts={financialDrafts}
                            onEditDraft={onEditDraft}
                            onDeleteDraft={(draftId) => {
                                setFinancialDrafts(drafts => 
                                    drafts.filter(d => d.id !== draftId)
                                );
                            }}
                            onNewReport={() => {
                                setShowFinancialDrafts(false);
                                setShowFillForm(true);
                            }}
                            onReturnToMenu={() => {}} // Empty function since we'll use single return button
                        />
                    </div>

                    {/* Program Report Drafts */}
                    <div className="mb-6">
                        <h3 className="text-xl font-bold mb-4">{t('program.draftsTitle')}</h3>
                        <ProgramReportDrafts
                            drafts={programDrafts}
                            onEditDraft={async (draftId) => {
                                try {
                                    // Get current session
                                    const { data: { session } } = await newSupabase.auth.getSession();
                                    
                                    if (!session) {
                                        throw new Error('No active session');
                                    }

                                    const response = await fetch(
                                        `/api/program-report-drafts?draft_id=${draftId}&project_id=${selectedProject.id}`,
                                        {
                                            credentials: 'include',
                                            headers: {
                                                'Authorization': `Bearer ${session.access_token}`
                                            }
                                        }
                                    );
                                    
                                    if (!response.ok) throw new Error('Failed to fetch draft');
                                    
                                    const data = await response.json();
                                    const { draft } = data;
                                    if (!draft) throw new Error('No draft data received');

                                    // Transform the draft data to match the form structure
                                    const formattedDraft: ProgramReportDraft = {
                                        id: draft.id,
                                        report_date: draft.report_date || '',
                                        positive_changes: draft.positive_changes || '',
                                        negative_results: draft.negative_results || '',
                                        unexpected_results: draft.unexpected_results || '',
                                        lessons_learned: draft.lessons_learned || '',
                                        suggestions: draft.suggestions || '',
                                        reporting_person: draft.reporting_person || '',
                                        activities: draft.err_program_reach?.map(activity => ({
                                            id: activity.id,
                                            activity_name: activity.activity_name || '',
                                            activity_goal: activity.activity_goal || '',
                                            location: activity.location || '',
                                            start_date: activity.start_date || '',
                                            end_date: activity.end_date || '',
                                            individual_count: activity.individual_count || 0,
                                            household_count: activity.household_count || 0,
                                            male_count: activity.male_count || 0,
                                            female_count: activity.female_count || 0,
                                            under18_male: activity.under18_male || 0,
                                            under18_female: activity.under18_female || 0
                                        })) || []
                                    };

                                    setCurrentProgramDraft(formattedDraft);
                                    setShowFinancialDrafts(false);
                                    setShowProgramForm(true);
                                } catch (error) {
                                    console.error('Error loading draft:', error);
                                    alert(t('drafts.loadError'));
                                }
                            }}
                            onDeleteDraft={(draftId) => {
                                setProgramDrafts(drafts => 
                                    drafts.filter(d => d.id !== draftId)
                                );
                            }}
                            onNewReport={() => {
                                setShowFinancialDrafts(false);
                                setShowProgramForm(true);
                            }}
                            onReturnToMenu={() => {}} // Empty function since we'll use single return button
                        />
                    </div>

                    {/* Single Return to Menu button */}
                    <Button
                        text={t('returnToMenu')}
                        onClick={() => {
                            resetFormStates();
                            setSelectedProject(null);
                            handleMenuSelection(CurrentMenu.REPORTING);
                        }}
                        className="w-full mt-4"
                    />
                </div>
            )}
        </ChatContainer>
    );
};

export default Menu;
