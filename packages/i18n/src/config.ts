import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "../locales/en.json";
import fr from "../locales/fr.json";

const isServer = typeof window === "undefined";

// Initialise i18n une seule fois, en enregistrant tous les plugins
// de façon synchrone avant d'appeler .init()
if (!i18n.isInitialized) {
  const instance = i18n.use(initReactI18next);

  if (!isServer) {
    instance.use(LanguageDetector);
  }

  instance.init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
    },
    lng: isServer ? "fr" : undefined, // côté client, laisser le détecteur choisir
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
  });
}

export default i18n;
