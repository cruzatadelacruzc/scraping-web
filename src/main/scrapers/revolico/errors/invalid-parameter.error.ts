import { AppError } from '@shared/errors/app.error';

/**
 * Custom error class to handle invalid parameter exceptions.
 * This error is thrown when a required parameter is missing or invalid.
 *
 * @class InvalidParameterError
 * @extends {AppError}
 *
 * @param {string} message - Error message describing the invalid parameter issue.
 * @param {string} [parameter] - The specific parameter that caused the error (optional).
 */
export class InvalidParameterError extends AppError {
  public constructor(parameter: string) {
    super(`Invalid parameter: ${parameter}`, 400, 'INVALID_PARAMETER');
  }
}
