export class TokenExpiredError extends Error {
  public readonly statusCode = 410;
  public constructor(message = 'Token has expired') {
    super(message);
    this.name = 'TokenExpiredError';
  }
}
