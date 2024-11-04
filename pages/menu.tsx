import { useState } from 'react';
import { useRouter } from 'next/router';
import ChatContainer from '../components/ChatContainer';
import MessageBubble from '../components/MessageBubble';
import Button from '../components/Button';

const getCurrentTimestamp = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const Menu = () => {
    const [showIntro, setShowIntro] = useState(true);
    const [showMenu, setShowMenu] = useState(false);
    const router = useRouter();

    const handleStartClick = () => {
        setShowIntro(false);
        setShowMenu(true);
    };

    const handleMenuSelection = (path: string) => {
        router.push(path);
    };

    return (
        <ChatContainer>
            {showIntro && (
                <MessageBubble
                    text="Welcome to the chatbot! Click Start to begin."
                    timestamp={getCurrentTimestamp()}
                />
            )}
            {showIntro && (
                <div className="text-center">
                    <Button text="Start" onClick={handleStartClick} />
                </div>
            )}

            {showMenu && (
                <>
                    <MessageBubble
                        text="Select an option:"
                        timestamp={getCurrentTimestamp()}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-4">
                        <Button text="Report Free Form" onClick={() => handleMenuSelection('/free-form')} />
                        <Button text="Report Fill Form" onClick={() => handleMenuSelection('/fill-form')} />
                        <Button text="Report Scan Form" onClick={() => handleMenuSelection('/scan-form')} />
                        <Button text="Exit" onClick={() => router.push('/')} />
                    </div>
                </>
            )}
        </ChatContainer>
    );
};

export default Menu;
