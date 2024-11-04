import { FC } from 'react';

interface MessageBubbleProps {
    text: string;
    isOutgoing?: boolean;
    timestamp?: string;
}

const MessageBubble: FC<MessageBubbleProps> = ({ text, isOutgoing = false, timestamp }) => {
    return (
        <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} mb-2`}>
            <div className={`max-w-xs p-3 rounded-lg ${isOutgoing ? 'bg-[#DCF8C6] text-right' : 'bg-white text-left'} shadow`}>
                <p>{text}</p>
                <span className="text-xs text-gray-500 mt-1 block">{timestamp}</span>
            </div>
        </div>
    );
};

export default MessageBubble;
