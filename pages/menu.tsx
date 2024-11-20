// pages/menu.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import ChatContainer from '../components/ChatContainer';
import MessageBubble from '../components/MessageBubble';
import Button from '../components/Button';
import FillForm from '../pages/fill-form';
import ScanForm from '../pages/scan-form';
import ProjectApplication from '../pages/project-application';
import ProjectStatus from '../pages/project-status';
import LogoImage from '../public/avatar.JPG';

const getCurrentTimestamp = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const Menu = () => {
    const [currentMenu, setCurrentMenu] = useState('main'); // Tracks the current menu
    const [showFillForm, setShowFillForm] = useState(false);
    const [showScanForm, setShowScanForm] = useState(false);
    const [showProjectApplication, setShowProjectApplication] = useState(false);
    const [showProjectStatus, setShowProjectStatus] = useState(false);

    const router = useRouter();
    const { t, i18n } = useTranslation('menu');

    useEffect(() => {
        const checkAuth = async () => {
            const response = await fetch('/api/validate-session', { credentials: 'include' });
            if (!response.ok) {
                router.push('/login'); // Redirect to login if session is invalid
            }
        };

        checkAuth();
    }, [router]);

    useEffect(() => {
        // Dynamically set the text direction (RTL or LTR) based on the current language
        const direction = i18n.language === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.setAttribute('dir', direction);
        document.documentElement.setAttribute('lang', i18n.language);
    }, [i18n.language]);

    const handleMenuSelection = (menu: string) => {
        setCurrentMenu(menu);
        setShowFillForm(false);
        setShowScanForm(false);
        setShowProjectApplication(false);
        setShowProjectStatus(false);
    };

    const handleWorkflowSelection = (workflow: string) => {
        setShowFillForm(false);
        setShowScanForm(false);
        setShowProjectApplication(false);
        setShowProjectStatus(false);

        if (workflow === 'fill-form') setShowFillForm(true);
        if (workflow === 'scan-form') setShowScanForm(true);
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
                <button onClick={() => i18n.changeLanguage('es')} className="mx-2 text-blue-500 hover:underline">
                    Español
                </button>
            </div>

            {currentMenu === 'main' && (
                <>
                    <div className="flex items-center mb-4 space-x-4">
                        <Image
                            src={LogoImage}
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
                        <Button text={t('exitChat')} onClick={() => router.push('/login')} className="w-full" />
                    </div>
                </>
            )}

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
                        <Button text={t('returnToMainMenu')} onClick={() => handleMenuSelection('main')} className="w-full" />
                    </div>
                </>
            )}

            {currentMenu === 'reporting' && (
                <>
                    <MessageBubble
                        text={t('reportingInstructions')}
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
                        <Button text={t('returnToMainMenu')} onClick={() => handleMenuSelection('main')} className="w-full" />
                    </div>
                </>
            )}

            {showFillForm && (
                <MessageBubble>
                    <FillForm onReturnToMenu={() => handleMenuSelection('reporting')} />
                </MessageBubble>
            )}

            {showScanForm && (
                <MessageBubble>
                    <ScanForm onReturnToMenu={() => handleMenuSelection('reporting')} />
                </MessageBubble>
            )}

            {showProjectApplication && (
                <MessageBubble>
                    <ProjectApplication onReturnToMenu={() => handleMenuSelection('projects')} />
                </MessageBubble>
            )}

            {showProjectStatus && (
                <MessageBubble>
                    <ProjectStatus onReturnToMenu={() => handleMenuSelection('projects')} />
                </MessageBubble>
            )}
        </ChatContainer>
    );
};

export default Menu;





