/**
 * Custom error class to handle invalid parameter exceptions.
 * This error is thrown when a required parameter is missing or invalid.
 *
 * @class InvalidParameterError
 * @extends {Error}
 *
 * @param {string} message - Error message describing the invalid parameter issue.
 * @param {string} [parameter] - The specific parameter that caused the error (optional).
 */
export class InvalidParameterError extends Error {
  constructor(parameter: string) {
    super(`Invalid parameter: ${parameter}`);
    this.name = 'InvalidParameterError';
  }
}
