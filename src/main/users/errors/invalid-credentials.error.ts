import { AppError } from '@shared/errors/app.error';

/**
 * Thrown when login credentials are invalid (user not found, wrong password,
 * or account has no password set). Always surfaced as 401 to prevent user
 * enumeration.
 */
export class InvalidCredentialsError extends AppError {
  public constructor(message = 'Invalid credentials') {
    super(message, 401, 'INVALID_CREDENTIALS');
  }
}
