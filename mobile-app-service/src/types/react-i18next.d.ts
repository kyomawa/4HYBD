// Types supplémentaires pour react-i18next
declare module 'react-i18next' {
  import { i18n } from 'i18next';
  
  export const initReactI18next: any;
  
  export interface UseTranslationResponse {
    t: (key: string, options?: any) => string;
    i18n: i18n;
    ready: boolean;
  }
  
  export function useTranslation(namespace?: string | string[], options?: any): UseTranslationResponse;
}

export {}; 