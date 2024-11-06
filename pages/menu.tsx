// pages/menu.tsx
import { useState } from 'react';
import { useRouter } from 'next/router';
import ChatContainer from '../components/ChatContainer';
import MessageBubble from '../components/MessageBubble';
import Button from '../components/Button';
import FillForm from '../pages/fill-form';
import ScanForm from '../pages/scan-form';

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
                    <MessageBubble
                        text="Welcome to the chatbot! Click Start to begin."
                        timestamp={getCurrentTimestamp()}
                    />
                    <div className="text-center">
                        <Button text="Start" onClick={handleStartClick} />
                    </div>
                </>
            )}

            {showMenu && (
                <div className="w-full max-w-md mx-auto space-y-1 mt-0"> {/* Shared width and reduced spacing */}
                    <MessageBubble
                        text="Select an option:"
                        timestamp={getCurrentTimestamp()}
                    />
                    <div className="grid grid-cols-1 gap-0"> {/* Minimal gap between buttons */}
                        <Button text="Report Free Form" onClick={() => handleMenuSelection('free-form')} className="w-full" />
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
