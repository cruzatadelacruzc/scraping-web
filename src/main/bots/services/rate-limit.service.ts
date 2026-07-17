import { inject, injectable } from 'inversify';
import Redis from 'ioredis';
import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';

export interface IRateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
  remaining: number;
}

/** Prefix for rate-limit keys in Redis. */
const KEY_PREFIX = 'bot:ratelimit:';

/** Max validation attempts per chat per window. */
const MAX_VALIDATION_ATTEMPTS = 5;

/** Window for validation attempts (in seconds). */
const VALIDATION_WINDOW_S = 10 * 60; // 10 minutes

/** Lock duration after exceeding attempts (in seconds). */
const LOCK_DURATION_S = 30 * 60; // 30 minutes

/** Max code generations per user per window. */
const MAX_GENERATION_ATTEMPTS = 3;

/** Window for generation attempts. */
const GENERATION_WINDOW_S = 10 * 60;

@injectable()
export class BotRateLimitService {
  private readonly _redis: Redis;

  public constructor(@inject(TYPES.Logger) private readonly _log: ILogger) {
    this._log.context = BotRateLimitService.name;

    // Reuse the same Redis URL that BullMQ uses.
    // lazyConnect delays the TCP handshake until the first Redis command.
    const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
    this._redis = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      connectTimeout: 2000,
      maxLoadingRetryTime: 2000,
    });
  }

  /**
   * Disconnects the Redis client so Jest can exit cleanly.
   * Call from {@link App.close()} or test teardown.
   */
  public async destroy(): Promise<void> {
    try {
      await this._redis.quit();
    } catch {
      // best-effort — process may already be shutting down
    }
  }

  // ---------------------------------------------------------------------------
  // Bot-side: validation attempts per chatId
  // ---------------------------------------------------------------------------

  /**
   * Checks whether the given chatId is allowed to attempt a code validation.
   *
   * @returns `allowed: false` with `retryAfterMs` if rate-limited.
   */
  public async checkValidationAttempt(chatId: string): Promise<IRateLimitResult> {
    try {
      const lockKey = `${KEY_PREFIX}lock:validate:${chatId}`;
      const countKey = `${KEY_PREFIX}count:validate:${chatId}`;

      // Check if currently locked
      const lockTtl = await this._redis.ttl(lockKey);
      if (lockTtl > 0) {
        return { allowed: false, retryAfterMs: lockTtl * 1000, remaining: 0 };
      }

      // Increment attempt counter
      const pipeline = this._redis.pipeline();
      pipeline.incr(countKey);
      pipeline.ttl(countKey);
      const [[, count], [, ttl]] = (await pipeline.exec()) as [[Error | null, number], [Error | null, number]];

      // Set window on first attempt
      if (ttl === -1) {
        await this._redis.expire(countKey, VALIDATION_WINDOW_S);
      }

      const remaining = Math.max(0, MAX_VALIDATION_ATTEMPTS - count);
      if (count > MAX_VALIDATION_ATTEMPTS) {
        // Lock the chat
        await this._redis.setex(lockKey, LOCK_DURATION_S, '1');
        this._log.warn('Chat locked after too many validation attempts', { chatId, count });
        return { allowed: false, retryAfterMs: LOCK_DURATION_S * 1000, remaining: 0 };
      }

      return { allowed: true, retryAfterMs: 0, remaining };
    } catch (err: unknown) {
      // Fail-open: if Redis is down, don't block linking
      this._log.warn('Rate-limit check failed, allowing', { error: String(err), chatId });
      return { allowed: true, retryAfterMs: 0, remaining: -1 };
    }
  }

  /**
   * Records a successful validation (resets the counter for the chat).
   */
  public async recordSuccessfulValidation(chatId: string): Promise<void> {
    try {
      const countKey = `${KEY_PREFIX}count:validate:${chatId}`;
      await this._redis.del(countKey);
    } catch (err: unknown) {
      this._log.warn('Failed to record successful validation', { error: String(err), chatId });
    }
  }

  // ---------------------------------------------------------------------------
  // API-side: code generation per user
  // ---------------------------------------------------------------------------

  /**
   * Checks whether the given userId is allowed to generate more link codes.
   */
  public async checkCodeGeneration(userId: string): Promise<IRateLimitResult> {
    try {
      const countKey = `${KEY_PREFIX}count:generate:${userId}`;

      const pipeline = this._redis.pipeline();
      pipeline.incr(countKey);
      pipeline.ttl(countKey);
      const [[, count], [, ttl]] = (await pipeline.exec()) as [[Error | null, number], [Error | null, number]];

      if (ttl === -1) {
        await this._redis.expire(countKey, GENERATION_WINDOW_S);
      }

      const remaining = Math.max(0, MAX_GENERATION_ATTEMPTS - count);
      if (count > MAX_GENERATION_ATTEMPTS) {
        this._log.warn('User rate-limited for code generation', { userId, count });
        return { allowed: false, retryAfterMs: GENERATION_WINDOW_S * 1000, remaining: 0 };
      }

      return { allowed: true, retryAfterMs: 0, remaining };
    } catch (err: unknown) {
      // Fail-open
      this._log.warn('Rate-limit check failed, allowing', { error: String(err), userId });
      return { allowed: true, retryAfterMs: 0, remaining: -1 };
    }
  }
}
