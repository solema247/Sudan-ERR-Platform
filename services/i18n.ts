//lib/i18n.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

i18n.use(initReactI18next).init({
  resources: {
    en: {
      login: require("../public/locales/en/login.json"),
      menu: require("../public/locales/en/menu.json"),
      chat: require("../public/locales/en/chat.json"),
      fillForm: require("../public/locales/en/fill-form.json"),
      scanForm: require("../public/locales/en/scan-form.json"),
      customScanForm: require("../public/locales/en/custom-scan-form.json"), 
      prompts: require("../public/locales/en/prompts.json"),
      offlineMode: require("../public/locales/en/offline-mode.json"),
      projectApplication: require("../public/locales/en/project-application.json"),
      projectStatus: require("../public/locales/en/project-status.json"),
      home: require("../public/locales/en/home.json"),
      feedback: require("../public/locales/en/feedback.json"),
      'program-report': require("../public/locales/en/program-report.json"),
      'financial-report': require("../public/locales/en/financial-report.json"),
    },
    ar: {
      login: require("../public/locales/ar/login.json"),
      menu: require("../public/locales/ar/menu.json"),
      chat: require("../public/locales/ar/chat.json"),
      fillForm: require("../public/locales/ar/fill-form.json"),
      scanForm: require("../public/locales/ar/scan-form.json"),
      customScanForm: require("../public/locales/ar/custom-scan-form.json"), 
      prompts: require("../public/locales/ar/prompts.json"),
      offlineMode: require("../public/locales/ar/offline-mode.json"),
      projectApplication: require("../public/locales/ar/project-application.json"),
      projectStatus: require("../public/locales/ar/project-status.json"),
      home: require("../public/locales/ar/home.json"),
      feedback: require("../public/locales/ar/feedback.json"),
      'program-report': require("../public/locales/ar/program-report.json"),
      'financial-report': require("../public/locales/ar/financial-report.json"),
    },
    es: {
      login: require("../public/locales/es/login.json"),
      menu: require("../public/locales/es/menu.json"),
      chat: require("../public/locales/es/chat.json"),
      fillForm: require("../public/locales/es/fill-form.json"),
      scanForm: require("../public/locales/es/scan-form.json"),
      customScanForm: require("../public/locales/es/custom-scan-form.json"), 
      prompts: require("../public/locales/es/prompts.json"),
      offlineMode: require("../public/locales/es/offline-mode.json"),
      projectApplication: require("../public/locales/es/project-application.json"),
      projectStatus: require("../public/locales/es/project-status.json"),
      home: require("../public/locales/es/home.json"),
    },
  },
  lng: "en", // Default language
  fallbackLng: "en", // Fallback language
  interpolation: {
    escapeValue: false, // React already escapes values
  },
});

export default i18n;


