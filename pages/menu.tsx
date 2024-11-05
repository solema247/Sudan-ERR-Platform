// pages/menu.tsx

import { useState } from 'react';
import { useRouter } from 'next/router';
import ChatContainer from '../components/ChatContainer';
import MessageBubble from '../components/MessageBubble';
import Button from '../components/Button';
import FillForm from '../pages/fill-form';
import ScanForm from '../pages/scan-form';
import PrefilledForm from '../components/PrefilledForm';

const getCurrentTimestamp = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const Menu = () => {
    const [showIntro, setShowIntro] = useState(true);
    const [showMenu, setShowMenu] = useState(false);
    const [showFillForm, setShowFillForm] = useState(false);
    const [showScanForm, setShowScanForm] = useState(false);
    const [prefilledData, setPrefilledData] = useState(null); // State to hold prefilled form data

    const router = useRouter();

    const handleStartClick = () => {
        setShowIntro(false);
        setShowMenu(true);
    };

    const handleMenuSelection = async (selection: string) => {
        setShowFillForm(false);
        setShowScanForm(false);
        setShowMenu(false);

        if (selection === 'fill-form') {
            setShowFillForm(true);
        } else if (selection === 'scan-form') {
            setShowScanForm(true);
        }
    };

    const handlePrefilledFormLoad = () => {
        const data = localStorage.getItem('prefillData');
        if (data) {
            setPrefilledData(JSON.parse(data));
        } else {
            console.error('No prefill data found in localStorage');
        }
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

            {showFillForm && (
                <MessageBubble timestamp={getCurrentTimestamp()}>
                    <FillForm />
                </MessageBubble>
            )}

            {showScanForm && (
                <MessageBubble timestamp={getCurrentTimestamp()}>
                    <ScanForm onScanSuccess={handlePrefilledFormLoad} />
                </MessageBubble>
            )}

            {prefilledData && (
                <MessageBubble timestamp={getCurrentTimestamp()}>
                    <PrefilledForm data={prefilledData} />
                </MessageBubble>
            )}
        </ChatContainer>
    );
};

export default Menu;
