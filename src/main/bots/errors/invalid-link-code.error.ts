import { AppError } from '@shared/errors/app.error';

export class InvalidLinkCodeError extends AppError {
  public constructor(public readonly code: string) {
    super(`Invalid or expired link code: ${code}`, 400, 'INVALID_LINK_CODE');
  }
}
