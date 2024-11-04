// components/ScanBubble.tsx
import React, { ReactNode } from 'react';

interface ScanBubbleProps {
    children: ReactNode;
}

const ScanBubble: React.FC<ScanBubbleProps> = ({ children }) => {
    return (
        <div className="w-full max-w-md mx-auto px-4 my-2 bg-white rounded-lg shadow-md">
            {children}
        </div>
    );
};

export default ScanBubble;
