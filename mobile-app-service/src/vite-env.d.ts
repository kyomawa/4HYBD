/// <reference types="vite/client" />

// Fix pour les erreurs TypeScript i18next
declare module 'react-i18next' {
  interface UseTranslationResponse {
    t: (key: string, options?: any) => string;
  }
}
