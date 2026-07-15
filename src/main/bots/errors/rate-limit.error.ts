import { AppError } from '@shared/errors/app.error';

export class RateLimitError extends AppError {
  public constructor(
    public readonly externalId: string,
    public readonly retryAfterMs: number,
  ) {
    super(`Rate limit for ${externalId}, retry after ${retryAfterMs}ms`, 429, 'RATE_LIMITED');
  }
}
