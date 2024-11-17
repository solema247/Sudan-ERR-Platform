import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n.use(initReactI18next).init({
    resources: {
        en: { login: require('../public/locales/en/login.json') },
        ar: { login: require('../public/locales/ar/login.json') },
        es: { login: require('../public/locales/es/login.json') },
    },
    lng: 'en', // Default language
    fallbackLng: 'en',
    interpolation: {
        escapeValue: false, // React already escapes text
    },
});

export default i18n;
