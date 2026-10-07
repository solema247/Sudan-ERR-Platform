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
            <div className="bg-brand-blue text-white px-4 py-3 flex items-center rounded-t-lg shadow-md border-b-4 border-brand-orange">
                <div className="flex items-center space-x-3">
                    <div className="bg-white rounded-full p-1 flex items-center justify-center" style={{ width: 44, height: 44 }}>
                        <Image src="/brand/err-logo.png" alt="ERR" width={36} height={36} />
                    </div>
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


