import { logger } from './logger.service';
import { toast } from '../utils/toast';

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public severity: 'error' | 'warning' | 'info' = 'error'
  ) {
    super(message);
    this.name = 'AppError';
  }
}

class ErrorService {
  private static instance: ErrorService;
  private errorHandlers: Map<string, (error: AppError) => void> = new Map();

  private constructor() {
    this.setupGlobalErrorHandlers();
  }

  static getInstance(): ErrorService {
    if (!ErrorService.instance) {
      ErrorService.instance = new ErrorService();
    }
    return ErrorService.instance;
  }

  private setupGlobalErrorHandlers() {
    window.onerror = (message, source, lineno, colno, error) => {
      this.handleError(error || new Error(message as string));
      return true;
    };

    window.onunhandledrejection = (event) => {
      this.handleError(event.reason);
    };
  }

  registerErrorHandler(code: string, handler: (error: AppError) => void) {
    this.errorHandlers.set(code, handler);
  }

  handleError(error: Error | unknown) {
    const appError = this.normalizeError(error);
    
    // Log l'erreur
    logger.error(`[${appError.code}] ${appError.message}`, {
      error: appError,
      stack: appError.stack
    });

    // Vérifier si un handler spécifique existe
    const handler = this.errorHandlers.get(appError.code);
    if (handler) {
      handler(appError);
      return;
    }

    // Handler par défaut
    this.defaultErrorHandler(appError);
  }

  private normalizeError(error: Error | unknown): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      return new AppError(
        error.message,
        'UNKNOWN_ERROR',
        'error'
      );
    }

    return new AppError(
      'Une erreur inconnue est survenue',
      'UNKNOWN_ERROR',
      'error'
    );
  }

  private defaultErrorHandler(error: AppError) {
    // Afficher un toast à l'utilisateur
    toast({
      message: error.message,
      duration: 3000,
      color: error.severity === 'error' ? 'danger' : 'warning'
    });
  }
}

export const errorService = ErrorService.getInstance();

// Codes d'erreur prédéfinis
export const ErrorCodes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CAMERA_ERROR: 'CAMERA_ERROR',
  STORAGE_ERROR: 'STORAGE_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const; 