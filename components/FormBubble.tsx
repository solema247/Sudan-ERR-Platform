// FormBubble.tsx
import React, { ReactNode } from 'react';

interface FormBubbleProps {
    children: ReactNode;
}

const FormBubble: React.FC<FormBubbleProps> = ({ children }) => {
    return (
        <div className="w-full px-2 my-1 bg-white rounded-lg">
            {children}
        </div>
    );
};

export default FormBubble;
