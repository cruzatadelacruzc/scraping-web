import { AppError } from '@shared/errors/app.error';

export class AccountDeactivatedError extends AppError {
  public constructor(message = 'This account has been deactivated. Contact support to reactivate.') {
    super(message, 403, 'ACCOUNT_DEACTIVATED');
  }
}
