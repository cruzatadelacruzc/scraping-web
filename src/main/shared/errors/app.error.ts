/**
 * Base class for all domain-specific errors in the application.
 *
 * Every subclass MUST provide a `statusCode` so the global error handler can
 * respond with the correct HTTP status. The optional `errorCode` is a
 * machine-readable identifier (e.g. "INVALID_CREDENTIALS") for clients that
 * prefer logic by code over message text.
 *
 * The constructor sets `this.name` to the subclass's constructor name and
 * fixes the prototype chain so `instanceof` checks work reliably in
 * TypeScript (ES5+ target) without each subclass repeating the boilerplate.
 *
 * @class AppError
 * @extends {Error}
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode?: string;

  public constructor(message: string, statusCode: number, errorCode?: string) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
