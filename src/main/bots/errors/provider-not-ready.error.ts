import { AppError } from '@shared/errors/app.error';

export class ProviderNotReadyError extends AppError {
  public constructor(provider: string) {
    super(`Bot provider "${provider}" is not ready`, 503, 'PROVIDER_NOT_READY');
  }
}
