/**
 * Thrown when the requested account does not exist in the database.
 */
export class AccountNotFoundError extends Error {
  public readonly statusCode: number;

  public constructor(message = 'error:account-not-found') {
    super(message);
    this.name = 'AccountNotFoundError';
    this.statusCode = 404;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
