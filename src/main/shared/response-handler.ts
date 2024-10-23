import { Response } from 'express';

/**
 * @description Response handler class is a utility class for sending consistent API responses.
 * @class ResponseHandler
 */
export class ResponseHandler {
  /**
   * Send a successful response with a custom message and status code.
   * @param {Response} res - Express Response object.
   * @param {any} data - Data to be sent in the response.
   * @param {string} [message='Success'] - Custom message for the response.
   * @param {number} [statusCode=200] - HTTP status code (defaults to 200).
   */
  public static success(res: Response, message: string, statusCode: number = 200, data?: any, meta?: any): void {
    res.status(statusCode).json({
      status: 'success',
      message,
      data,
      meta,
    });
  }

  /**
   * Send an error response with a custom message and status code.
   * @param {Response} res - Express Response object.
   * @param {string} [message='Something went wrong'] - Custom error message.
   * @param {number} [statusCode=500] - HTTP status code (defaults to 500).
   */
  public static error(res: Response, message: string = 'Something went wrong', statusCode: number = 500, error?: any): void {
    res.status(statusCode).json({
      status: 'error',
      message,
      error,
    });
  }

  /**
   * Send a 201 Created response indicating a resource has been successfully created.
   * @param {Response} res - Express Response object.
   * @param {any} data - Data related to the created resource.
   * @param {string} [message='Resource created'] - Custom message for the response.
   */
  public static created(res: Response, message: string = 'Resource created', data?: any): void {
    ResponseHandler.success(res, message, 201, data);
  }

  /**
   * Send a 400 Bad Request response indicating a client error.
   * @param {Response} res - Express Response object.
   * @param {string} message [message='Resource created'] - Custom error message.
   * @param {any} error - Additional error data (optional).
   */
  public static badRequest(res: Response, message: string = 'Bad request', error?: any): void {
    ResponseHandler.error(res, message, 400, error);
  }

  /**
   * Send a 404 Not Found response when a requested resource is not found.
   * @param {Response} res - Express Response object.
   * @param {string} [message='Resource not found'] - Custom message for the response.
   */
  public static notFound(res: Response, message: string = 'Resource not found', error?: any): void {
    ResponseHandler.error(res, message, 404, error);
  }

  /**
   * @description Handles unauthenticated responses for various authentication methods.
   * @param {Response} res - The Express response object.
   * @param {string} [message='unauthenticated'] - The error message to send in the response.
   * @param {number} [statusCode=401] - The HTTP status code for unauthenticated access.
   * @param {boolean} [isBasicAuth=false] - Define basic authentication type.
   * @param {any} [error] - Optional error object for detailed logging or debugging.
   */
  public static unAuthenticated(res: Response, isBasicAuth: boolean = false, message: string = 'unauthenticated', error?: any): void {
    if (isBasicAuth) {
      res.set('WWW-Authenticate', 'Basic realm="401"');
    }
    ResponseHandler.error(res, message, 401, error);
  }
}
