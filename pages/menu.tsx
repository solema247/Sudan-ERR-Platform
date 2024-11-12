// pages/menu.tsx
import { useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import ChatContainer from '../components/ChatContainer';
import MessageBubble from '../components/MessageBubble';
import Button from '../components/Button';
import FillForm from '../pages/fill-form';
import ScanForm from '../pages/scan-form';
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

    const router = useRouter();

    const handleStartClick = () => {
        setShowMenu(true);
    };

    const handleMenuSelection = (selection: string) => {
        setShowFillForm(false);
        setShowScanForm(false);
        setShowMenu(false);

        if (selection === 'fill-form') {
            setShowFillForm(true);
        } else if (selection === 'scan-form') {
            setShowScanForm(true);
        }
    };

    // Callback to navigate back to the main menu
    const navigateToMenu = () => {
        setShowFillForm(false);
        setShowScanForm(false);
        setShowMenu(true);
    };

    // Callback to reset and allow form submission again
    const submitAnotherForm = () => {
        setShowFillForm(true);
    };

    // Add the submitAnotherForm function for ScanForm
    const submitAnotherScanForm = () => {
      setShowScanForm(true);
    };

    return (
        <ChatContainer>
            {showIntro && (
                <>
                    {/* Logo and Title aligned to the left */}
                    <div className="flex items-center mb-4 space-x-4">
                        <Image
                            src={LogoImage}
                            alt="Chatbot Logo"
                            width={80} // Smaller width to be around 60% of the bubble width
                            height={80}
                            className="rounded"
                        />
                        <div className="text-left font-bold text-lg">
                            Welcome to the Sudan ERR Bot
                        </div>
                    </div>
                    {/* Description text aligned to the left in a MessageBubble */}
                    <MessageBubble
                        text="This chatbot will help you with reporting on ERR impact and sharing information with the community and donors.<strong> Click Start to begin.</strong>"
                        timestamp={getCurrentTimestamp()}
                    />
                    <div className="text-center">
                        <Button text="Start" onClick={handleStartClick} />
                    </div>
                </>
            )}

            {showMenu && (
                <div className="w-full max-w-md mx-auto space-y-1 -mt-1"> {/* Shared width and reduced spacing */}
                    <MessageBubble
                        text="Choose a Reporting Method"
                        timestamp={getCurrentTimestamp()}
                        fullWidth 
                    />
                    <div className="grid grid-cols-1 -gap-1"> {/* Minimal gap between buttons */}

                        <Button text="Report Fill Form" onClick={() => handleMenuSelection('fill-form')} className="w-full" />
                        <Button text="Report Scan Form" onClick={() => handleMenuSelection('scan-form')} className="w-full" />
                        <Button text="Exit" onClick={() => router.push('/')} className="w-full" />
                    </div>
                </div>
            )}

            {showFillForm && (
                <MessageBubble timestamp={getCurrentTimestamp()}>
                    <FillForm 
                        onReturnToMenu={navigateToMenu} 
                        onSubmitAnotherForm={submitAnotherForm} 
                    />
                </MessageBubble>
            )}

            {showScanForm && (
              <MessageBubble>
                <ScanForm 
                  onReturnToMenu={navigateToMenu} 
                  onSubmitAnotherForm={submitAnotherScanForm}
                />
              </MessageBubble>
            )}
        </ChatContainer>
    );
};

export default Menu;

