import { AppError } from '@shared/errors/app.error';

export class InvalidArgumentError extends AppError {
  public constructor(message: string = 'error:invalid-argument') {
    super(message, 400, 'INVALID_ARGUMENT');
  }
}
