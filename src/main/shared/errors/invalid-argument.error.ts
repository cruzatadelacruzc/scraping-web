export class InvalidArgumentError extends Error {
  public constructor(message: string = 'error:invalid-argument') {
    super(message);
    Object.setPrototypeOf(this, InvalidArgumentError.prototype);
  }
}
