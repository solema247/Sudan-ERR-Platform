// FormBubble.tsx
import React, { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface FormBubbleProps {
    children: ReactNode;
    title?: string;
    showRequiredLegend?: boolean;
    removeBoxShadow?: boolean;
}

interface FormLabelProps {
    htmlFor?: string;
    required?: boolean;
    children: ReactNode;
    error?: string;
}

export const FormLabel: React.FC<FormLabelProps> = ({ htmlFor, required, children, error }) => {
    return (
        <div className="mb-1">
            <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700">
                {children}
                {required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {error && (
                <span className="text-sm text-red-500">{error}</span>
            )}
        </div>
    );
};

const FormBubble: React.FC<FormBubbleProps> = ({ 
    children, 
    title, 
    showRequiredLegend = false,
    removeBoxShadow = false
}) => {
    const { t } = useTranslation('fillForm');
    
    return (
        <div className={`max-w-4xl ml-auto pr-2 bg-white rounded-lg ${!removeBoxShadow ? 'shadow-lg' : ''}`}>
            <h2 className="text-2xl font-bold mb-4">{title}</h2>
            {showRequiredLegend && (
                <div className="text-sm text-gray-600 mb-4">
                    * {t('requiredFields')}
                </div>
            )}
            {children}
        </div>
    );
};

export default FormBubble;
