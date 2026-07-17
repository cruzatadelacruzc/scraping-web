import { AppError } from '@shared/errors/app.error';

export class UserNotFoundError extends AppError {
  public constructor(message: string = 'error:user-not-found') {
    super(message, 404, 'USER_NOT_FOUND');
  }
}
