import { AppError } from '@shared/errors/app.error';

export class TokenExpiredError extends AppError {
  public constructor(message = 'Token has expired') {
    super(message, 410, 'TOKEN_EXPIRED');
  }
}
