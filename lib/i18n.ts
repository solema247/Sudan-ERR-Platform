import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n.use(initReactI18next).init({
    resources: {
        en: {
            login: require('../public/locales/en/login.json'),
            menu: require('../public/locales/en/menu.json'),
            chat: require('../public/locales/en/chat.json'),
        },
        ar: {
            login: require('../public/locales/ar/login.json'),
            menu: require('../public/locales/ar/menu.json'),
            chat: require('../public/locales/ar/chat.json'),
        },
        es: {
            login: require('../public/locales/es/login.json'),
            menu: require('../public/locales/es/menu.json'),
            chat: require('../public/locales/es/chat.json'),
        },
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
        escapeValue: false,
    },
});

export default i18n;
