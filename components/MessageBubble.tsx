// components/MessageBubble.tsx
import { FC, ReactNode } from 'react';

interface MessageBubbleProps {
    text?: string;
    isOutgoing?: boolean;
    timestamp?: string;
    children?: ReactNode;
}

const MessageBubble: FC<MessageBubbleProps> = ({ text, isOutgoing = false, timestamp, children }) => {
    return (
        <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} mb-2 w-full`}>
            <div className={`w-full p-3 rounded-lg ${isOutgoing ? 'bg-[#DCF8C6] text-right' : 'bg-white text-left'} shadow`}>
                {children || <p>{text}</p>}
                {timestamp && <span className="text-xs text-gray-500 mt-1 block">{timestamp}</span>}
            </div>
        </div>
    );
};

export default MessageBubble;
