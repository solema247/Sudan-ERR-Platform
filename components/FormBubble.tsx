// FormBubble.tsx
import React, { ReactNode } from 'react';

interface FormBubbleProps {
    children: ReactNode;
}

const FormBubble: React.FC<FormBubbleProps> = ({ children }) => {
    return (
        <div className="w-full px-4 my-2 bg-white rounded-lg shadow-md">
            {children}
        </div>
    );
};

export default FormBubble;
