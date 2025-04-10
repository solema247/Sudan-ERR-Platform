import { useTranslation } from 'react-i18next';

export const useFormTranslation = () => {
    const { t } = useTranslation();
    return { t };
}; 