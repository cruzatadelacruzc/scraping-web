import { AppError } from '@shared/errors/app.error';

export class ProviderConfigError extends AppError {
  public constructor(message = 'Provider configuration error') {
    super(message, 500, 'PROVIDER_CONFIG_ERROR');
  }
}
