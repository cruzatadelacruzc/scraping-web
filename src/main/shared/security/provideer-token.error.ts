import { AppError } from '@shared/errors/app.error';

export class ProviderTokenError extends AppError {
  public constructor(message = 'Invalid provider token') {
    super(message, 401, 'PROVIDER_TOKEN_ERROR');
  }
}
