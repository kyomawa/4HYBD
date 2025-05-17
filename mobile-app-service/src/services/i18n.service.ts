import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { Preferences } from "@capacitor/preferences";

// Import translations
import translationEN from "../locales/en/translation.json";
import translationFR from "../locales/fr/translation.json";

// Ressources de traduction
const resources = {
  en: {
    translation: translationEN
  },
  fr: {
    translation: translationFR
  }
};

const LANGUAGE_KEY = "app_language";

// Initialisation de i18n
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "fr",
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ["localStorage", "navigator"]
    }
  });

// Fonction pour sauvegarder la langue dans le stockage
export const saveLanguagePreference = async (language: string): Promise<void> => {
  try {
    await Preferences.set({
      key: LANGUAGE_KEY,
      value: language
    });
  } catch (error) {
    console.error("Error saving language preference:", error);
  }
};

// Fonction pour obtenir la langue sauvegardée
export const getLanguagePreference = async (): Promise<string> => {
  try {
    const { value } = await Preferences.get({ key: LANGUAGE_KEY });
    return value || "fr"; // Par défaut français
  } catch (error) {
    console.error("Error getting language preference:", error);
    return "fr";
  }
};

// Fonction pour changer la langue de l'application
export const changeLanguage = async (language: string): Promise<void> => {
  try {
    await i18n.changeLanguage(language);
    await saveLanguagePreference(language);
  } catch (error) {
    console.error("Error changing language:", error);
  }
};

// Initialiser la langue au démarrage
export const initLanguage = async (): Promise<void> => {
  try {
    const savedLanguage = await getLanguagePreference();
    await i18n.changeLanguage(savedLanguage);
  } catch (error) {
    console.error("Error initializing language:", error);
  }
};

export default i18n; 