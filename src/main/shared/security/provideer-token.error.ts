export class ProviderTokenError extends Error {
  public status = 401;
  public constructor(message = 'Invalid provider token') {
    super(message);
    Object.setPrototypeOf(this, ProviderTokenError.prototype);
  }
}
