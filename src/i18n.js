import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import en from './locales/en.json'
import bn from './locales/bn.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      bn: { translation: bn },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values, no need to double up
    },
    detection: {
      // Remember the user's choice across visits, but only trust the browser's
      // own language on first visit — don't guess from IP/geolocation etc.
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'medlog_lang',
    },
  })

export default i18n
