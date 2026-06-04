export class ProviderConfigError extends Error {
  public status = 500;
  public constructor(message = 'Provider configuration error') {
    super(message);
    Object.setPrototypeOf(this, ProviderConfigError.prototype);
  }
}
