// componenents/MessageBubble.tsx
import { FC, ReactNode } from 'react';

interface MessageBubbleProps {
    text?: string;
    isOutgoing?: boolean;
    timestamp?: string;
    children?: ReactNode;
}

const MessageBubble: FC<MessageBubbleProps> = ({ text, isOutgoing = false, timestamp, children }) => {
    return (
        <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} mb-3 w-full`}>
            <div className={`max-w-sm md:max-w-md lg:max-w-lg p-4 rounded-2xl ${isOutgoing ? 'bg-[#DCF8C6]' : 'bg-white ml-1'} shadow-md`}>
                <p className="text-gray-700 font-normal text-base md:text-lg leading-relaxed">
                    {children || text}
                </p>
                {timestamp && <span className="text-xs text-gray-400 mt-1 block text-right">{timestamp}</span>}
            </div>
        </div>
    );
};

export default MessageBubble;


