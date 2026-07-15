import { AppError } from '@shared/errors/app.error';

/**
 * Thrown when the requested account does not exist in the database.
 */
export class AccountNotFoundError extends AppError {
  public constructor(message = 'error:account-not-found') {
    super(message, 404, 'ACCOUNT_NOT_FOUND');
  }
}
