import { AppError } from '@shared/errors/app.error';

export class ConflictError extends AppError {
  public constructor(message = 'Conflict') {
    super(message, 409, 'CONFLICT');
  }
}
