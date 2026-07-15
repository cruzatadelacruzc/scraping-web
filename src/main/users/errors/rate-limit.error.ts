import { AppError } from '@shared/errors/app.error';

export class RateLimitError extends AppError {
  public readonly retryAfterMs: number;
  public constructor(retryAfterMs: number, message = 'Too many attempts. Please try again later.') {
    super(message, 429, 'RATE_LIMITED');
    this.retryAfterMs = retryAfterMs;
  }
}
