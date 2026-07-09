export class AccountDeactivatedError extends Error {
  public readonly statusCode = 403;
  public constructor(message = 'This account has been deactivated. Contact support to reactivate.') {
    super(message);
    this.name = 'AccountDeactivatedError';
  }
}
