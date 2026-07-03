export class RateLimitError extends Error {
  public constructor(
    public readonly externalId: string,
    public readonly retryAfterMs: number,
  ) {
    super(`Rate limit for ${externalId}, retry after ${retryAfterMs}ms`);
    this.name = 'RateLimitError';
  }
}
