import 'i18next';

declare module 'i18next' {
  export interface InitOptions {
    resources?: any;
    lng?: string;
    fallbackLng?: string | string[] | boolean | object;
    interpolation?: {
      escapeValue?: boolean;
      [key: string]: any;
    };
    detection?: {
      order?: string[];
      [key: string]: any;
    };
    [key: string]: any;
  }

  export interface i18n {
    use(module: any): i18n;
    init(options: InitOptions): Promise<any>;
    changeLanguage(lng?: string): Promise<any>;
    t(key: string, options?: any): string;
  }
}

export {}; 