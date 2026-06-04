export class UserNotFoundError extends Error {
  public readonly statusCode: number;
  public constructor(message: string = 'error:user-not-found') {
    super(message);
    this.statusCode = 404;
    Object.setPrototypeOf(this, UserNotFoundError.prototype);
  }
}
