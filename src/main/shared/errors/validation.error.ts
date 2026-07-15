import { AppError } from '@shared/errors/app.error';

interface IValidationErrorDetail {
  code?: string;
  message: string;
  path?: (string | number)[];
}

export class ValidationError extends AppError {
  public constructor(
    public validationErrors: IValidationErrorDetail[],
    message: string = `error:validation`,
  ) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}
