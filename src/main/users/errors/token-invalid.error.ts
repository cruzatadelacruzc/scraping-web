export class TokenInvalidError extends Error {
  public readonly statusCode = 400;
  public constructor(message = 'Token is invalid or has already been used') {
    super(message);
    this.name = 'TokenInvalidError';
  }
}
