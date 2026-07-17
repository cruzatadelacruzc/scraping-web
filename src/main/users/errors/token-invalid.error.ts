import { AppError } from '@shared/errors/app.error';

export class TokenInvalidError extends AppError {
  public constructor(message = 'Token is invalid or has already been used') {
    super(message, 400, 'TOKEN_INVALID');
  }
}
