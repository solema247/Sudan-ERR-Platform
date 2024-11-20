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
import LogoImage from '../public/avatar.JPG'; // Import the logo image

const getCurrentTimestamp = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const Menu = () => {
    const [showIntro, setShowIntro] = useState(true);
    const [showMenu, setShowMenu] = useState(false);
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

    const handleStartClick = () => {
        setShowMenu(true);
    };

    const handleMenuSelection = (selection: string) => {
        setShowFillForm(false);
        setShowScanForm(false);
        setShowProjectApplication(false);
        setShowProjectStatus(false);
        setShowMenu(false);

        if (selection === 'fill-form') {
            setShowFillForm(true);
        } else if (selection === 'scan-form') {
            setShowScanForm(true);
        } else if (selection === 'project-application') {
            setShowProjectApplication(true);
        } else if (selection === 'project-status') {
            setShowProjectStatus(true);
        }
    };

    const navigateToMenu = () => {
        setShowFillForm(false);
        setShowScanForm(false);
        setShowProjectApplication(false);
        setShowProjectStatus(false);
        setShowMenu(true);
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

            {showIntro && (
                <>
                    <div className="flex items-center mb-4 space-x-4">
                        <Image
                            src={LogoImage}
                            alt={t('logoAlt')} // Translated alt text
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
                    />
                    <div className="text-center">
                        <Button text={t('startButton')} onClick={handleStartClick} />
                    </div>
                </>
            )}

            {showMenu && (
                <div className="w-full max-w-md mx-auto space-y-1 -mt-1">
                    <MessageBubble
                        text={t('chooseMethod')}
                        timestamp={getCurrentTimestamp()}
                        fullWidth
                    />
                    <div className="grid grid-cols-1 -gap-1">
                        <Button text={t('reportFillForm')} onClick={() => handleMenuSelection('fill-form')} className="w-full" />
                        <Button text={t('reportScanForm')} onClick={() => handleMenuSelection('scan-form')} className="w-full" />
                        <Button text={t('projectApplication')} onClick={() => handleMenuSelection('project-application')} className="w-full" />
                        <Button text={t('projectStatus')} onClick={() => handleMenuSelection('project-status')} className="w-full" />
                        <Button text={t('exit')} onClick={() => router.push('/')} className="w-full" />
                    </div>
                </div>
            )}

            {showFillForm && (
                <MessageBubble timestamp={getCurrentTimestamp()}>
                    <FillForm onReturnToMenu={navigateToMenu} />
                </MessageBubble>
            )}

            {showScanForm && (
                <MessageBubble>
                    <ScanForm onReturnToMenu={navigateToMenu} />
                </MessageBubble>
            )}

            {showProjectApplication && (
                <MessageBubble>
                    <ProjectApplication onReturnToMenu={navigateToMenu} />
                </MessageBubble>
            )}

            {showProjectStatus && (
                <MessageBubble>
                    <ProjectStatus />
                </MessageBubble>
            )}
        </ChatContainer>
    );
};

export default Menu;

