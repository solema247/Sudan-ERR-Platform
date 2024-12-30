// FormBubble.tsx
import React, { ReactNode } from 'react';

interface FormBubbleProps {
    children: ReactNode;
}

const FormBubble: React.FC<FormBubbleProps> = ({ children }) => {
    return (
        <div className="w-full px-2 bg-white rounded-lg max-w-full overflow-hidden">
            {children}
        </div>
    );
};

export default FormBubble;
