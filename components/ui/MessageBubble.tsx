// components/MessageBubble.tsx
import { FC, ReactNode, useEffect, useState } from 'react';

interface MessageBubbleProps {
    text?: string;
    isOutgoing?: boolean;
    timestamp?: string;
    children?: ReactNode;
    fullWidth?: boolean; // New prop for conditional full width
    className?: string;
}

const MessageBubble: FC<MessageBubbleProps> = ({ text, isOutgoing = false, timestamp, children, fullWidth = false, className = '' }) => {
    const [clientTimestamp, setClientTimestamp] = useState<string | null>(null);

    useEffect(() => {
        // Set the timestamp on the client side to avoid SSR mismatch
        setClientTimestamp(timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, [timestamp]);

    return (
        <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} mb-2 ${fullWidth ? 'w-full' : 'w-auto'} ${className}`}>
            <div className={`${fullWidth ? 'w-full' : 'max-w-sm md:max-w-md lg:max-w-lg'} p-3 rounded-2xl ${isOutgoing ? 'bg-[#DCF8C6]' : 'bg-white'} shadow-md`}>
                <div className="text-gray-700 font-normal text-base md:text-lg leading-relaxed">
                    {children ? (
                        children
                    ) : (
                        // Render HTML safely if 'text' contains HTML tags
                        <span dangerouslySetInnerHTML={{ __html: text || '' }} />
                    )}
                </div>
                {clientTimestamp && (
                    <span className="text-xs text-gray-400 -mt-1 block text-right"> {/* Reduced margin and size */}
                        {clientTimestamp}
                    </span>
                )}
            </div>
        </div>
    );
};

export default MessageBubble;
