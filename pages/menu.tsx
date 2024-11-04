import { useState } from 'react';
import { useRouter } from 'next/router';
import ChatContainer from '../components/ChatContainer';
import MessageBubble from '../components/MessageBubble';
import Button from '../components/Button';
import FillForm from '../pages/fill-form';
import ScanForm from '../pages/scan-form'; // Import ScanForm component

const getCurrentTimestamp = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const Menu = () => {
    const [showIntro, setShowIntro] = useState(true);
    const [showMenu, setShowMenu] = useState(false);
    const [showFillForm, setShowFillForm] = useState(false);
    const [showScanForm, setShowScanForm] = useState(false); // New state for showing ScanForm

    const handleStartClick = () => {
        setShowIntro(false);
        setShowMenu(true);
    };

    const handleMenuSelection = (selection: string) => {
        setShowFillForm(false);
        setShowScanForm(false); // Reset other forms when a new one is selected
        setShowMenu(false);

        if (selection === 'fill-form') {
            setShowFillForm(true);
        } else if (selection === 'scan-form') {
            setShowScanForm(true); // Show ScanForm
        }
        // Additional conditions can be added here for other selections
    };

    return (
        <ChatContainer>
            {/* Welcome message and start button */}
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

            {/* Menu options */}
            {showMenu && (
                <>
                    <MessageBubble
                        text="Select an option:"
                        timestamp={getCurrentTimestamp()}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-4">
                        <Button text="Report Free Form" onClick={() => handleMenuSelection('free-form')} />
                        <Button text="Report Fill Form" onClick={() => handleMenuSelection('fill-form')} />
                        <Button text="Report Scan Form" onClick={() => handleMenuSelection('scan-form')} />
                        <Button text="Exit" onClick={() => router.push('/')} />
                    </div>
                </>
            )}

            {/* Display FillForm as a form bubble when selected */}
            {showFillForm && (
                <MessageBubble timestamp={getCurrentTimestamp()}>
                    <FillForm />
                </MessageBubble>
            )}

            {/* Display ScanForm as a form bubble when selected */}
            {showScanForm && (
                <MessageBubble timestamp={getCurrentTimestamp()}>
                    <ScanForm />
                </MessageBubble>
            )}
        </ChatContainer>
    );
};

export default Menu;
