import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enLanding from './locales/en/landing.json';
import enProfile from './locales/en/profile.json';
import esCommon from './locales/es/common.json';
import esAuth from './locales/es/auth.json';
import esLanding from './locales/es/landing.json';
import esProfile from './locales/es/profile.json';

export const supportedLngs = ['es', 'en'] as const;
export type AppLanguage = (typeof supportedLngs)[number];
export const defaultNS = 'common';

export const resources = {
  en: { common: enCommon, auth: enAuth, landing: enLanding, profile: enProfile },
  es: { common: esCommon, auth: esAuth, landing: esLanding, profile: esProfile },
};

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'es',
    supportedLngs: [...supportedLngs],
    load: 'languageOnly',
    nonExplicitSupportedLngs: true,
    defaultNS,
    ns: ['common', 'auth', 'landing', 'profile'],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'lang',
      caches: ['localStorage'],
    },
  });

export default i18n;
