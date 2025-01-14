// FormBubble.tsx
import React, { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface FormBubbleProps {
    children: ReactNode;
    title?: string;
    showRequiredLegend?: boolean;
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

const FormBubble: React.FC<FormBubbleProps> = ({ children, title, showRequiredLegend }) => {
    const { t } = useTranslation('fillForm');

    return (
        <div className="w-full px-2 bg-white rounded-lg max-w-full overflow-hidden">
            {title && <h1 className="text-2xl font-bold text-center my-4">{title}</h1>}
            {showRequiredLegend && (
                <div className="text-sm text-gray-500 mb-4">
                    <span className="text-red-500">*</span> {t('requiredFields')}
                    <br />
                    <span className="text-xs italic">{t('expenseCardNote')}</span>
                </div>
            )}
            {children}
        </div>
    );
};

export default FormBubble;
