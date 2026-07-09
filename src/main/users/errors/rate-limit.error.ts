export class RateLimitError extends Error {
  public readonly statusCode = 429;
  public readonly retryAfterMs: number;
  public constructor(retryAfterMs: number, message = 'Too many attempts. Please try again later.') {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}
