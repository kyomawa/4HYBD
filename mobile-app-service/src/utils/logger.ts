/**
 * Logger simple pour remplacer console.log avec plus de contexte
 */
export const logger = {
  debug: (message: string, context?: any) => {
    console.debug(`[DEBUG] ${message}`, context || '');
  },
  info: (message: string, context?: any) => {
    console.info(`[INFO] ${message}`, context || '');
  },
  warn: (message: string, context?: any) => {
    console.warn(`[WARN] ${message}`, context || '');
  },
  error: (message: string, context?: any) => {
    console.error(`[ERROR] ${message}`, context || '');
  }
}; 