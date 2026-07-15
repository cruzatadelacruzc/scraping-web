import { Request, Response, NextFunction } from 'express';
import { AppError } from './app.error';
import { ResponseHandler } from '@shared/response-handler';
import { ILogger } from '@shared/logger.interface';

/**
 * Creates an Express error-handling middleware that discriminates between
 * known domain errors (AppError subclasses) and unexpected errors.
 *
 * - AppError → log at warn level, respond with the error's message and statusCode
 * - Any other Error → log at error level with stack, respond with generic 500
 *
 * @param log - The injected ILogger instance.
 * @returns An Express error-handling middleware function (4-parameter signature).
 */
export function createErrorHandler(log: ILogger) {
  return (error: Error, _req: Request, res: Response, _next: NextFunction): void => {
    void _next;
    void _req;
    if (error instanceof AppError) {
      log.warn('Handled domain error', {
        errorName: error.name,
        statusCode: error.statusCode,
        errorCode: error.errorCode,
        message: error.message,
      });
      ResponseHandler.error(res, error.message, error.statusCode);
      return;
    }

    log.error('Unhandled internal error', {
      errorName: error.name,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 10).join('\n'),
    });
    ResponseHandler.error(res, 'Internal server error');
  };
}
