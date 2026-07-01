export class ProviderNotReadyError extends Error {
  public constructor(provider: string) {
    super(`Bot provider "${provider}" is not ready`);
    this.name = 'ProviderNotReadyError';
  }
}
