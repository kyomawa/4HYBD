import { useCallback } from 'react';
import { errorService, AppError, ErrorCodes } from '../services/error.service';
import { logger } from '../services/logger.service';

export const useErrorHandler = () => {
  const handleError = useCallback((error: Error | unknown, context?: string) => {
    const appError = error instanceof AppError ? error : new AppError(
      error instanceof Error ? error.message : 'Une erreur inconnue est survenue',
      ErrorCodes.UNKNOWN_ERROR
    );

    if (context) {
      logger.error(`Erreur dans ${context}`, { error: appError });
    }

    errorService.handleError(appError);
  }, []);

  const handleAsyncError = useCallback(async <T>(
    promise: Promise<T>,
    context?: string
  ): Promise<T | null> => {
    try {
      return await promise;
    } catch (error) {
      handleError(error, context);
      return null;
    }
  }, [handleError]);

  return {
    handleError,
    handleAsyncError
  };
}; 