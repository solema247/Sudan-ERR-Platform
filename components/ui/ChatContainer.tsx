//componenets/ChatContainer.tsx
import { ReactNode } from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';

interface ChatContainerProps {
    children: ReactNode;
}

const ChatContainer = ({ children }: ChatContainerProps) => {
    const { t } = useTranslation('chat');

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-primaryGreen to-green-600 text-white px-4 py-3 flex items-center rounded-t-lg shadow-md">
                <div className="flex items-center space-x-3">
                    <Image
                        src="/avatar.JPG"
                        alt="Chatbot Avatar"
                        width={40}
                        height={40}
                        className="rounded-full"
                    />
                    <div>
                        <div className="font-bold text-sm md:text-base">Sudan Emergency Response Rooms Bot</div>
                        <div className="text-xs md:text-sm text-gray-200">{t('onlineStatus')}</div>
                    </div>
                </div>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-2" id="chat-box">
                {children}
            </div>
        </div>
    );
};

export default ChatContainer;


