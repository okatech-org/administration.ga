import i18n from "i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import { initReactI18next } from "react-i18next"
// Importer les traductions directement depuis le package i18n du monorepo
import en from "../../../../packages/i18n/locales/en.json"
import fr from "../../../../packages/i18n/locales/fr.json"

const isServer = typeof window === "undefined"

const instance = i18n.use(initReactI18next)

if (!isServer) {
  instance.use(LanguageDetector)
}

instance.init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
  },
  lng: "fr",
  fallbackLng: "fr",
  interpolation: {
    escapeValue: false,
  },
  ...(!isServer && {
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
    },
  }),
})

export default i18n
