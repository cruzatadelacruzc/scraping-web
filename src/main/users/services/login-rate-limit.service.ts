import { inject, injectable } from 'inversify';
import Redis from 'ioredis';
import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';

/**
 * Result of a rate-limit check.
 */
export interface IRateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
  remaining: number;
}

/** Prefix for rate-limit keys in Redis. */
const KEY_PREFIX = 'login:ratelimit:';

/** Max failed attempts per IP per window. */
const MAX_ATTEMPTS_PER_IP = 5;

/** Max failed attempts per username/email per window. */
const MAX_ATTEMPTS_PER_USER = 10;

/** Window for failed attempts (in seconds). */
const WINDOW_S = 15 * 60; // 15 minutes

/** Lock duration after exceeding attempts (in seconds). */
const LOCK_DURATION_S = 30 * 60; // 30 minutes

/**
 * Redis-based rate limiter for login attempts.
 *
 * Follows the same pattern as {@link BotRateLimitService}: fail-open if Redis
 * is unavailable, independent counters per IP and per username.
 */
@injectable()
export class LoginRateLimitService {
  private readonly _redis: Redis;

  public constructor(@inject(TYPES.Logger) private readonly _log: ILogger) {
    this._log.context = LoginRateLimitService.name;

    const log = this._log;
    const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
    this._redis = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      connectTimeout: 2000,
      maxLoadingRetryTime: 2000,
      enableOfflineQueue: false,
      retryStrategy(times: number): number | null {
        // Fail-open: give up immediately so callers can fall back
        log.warn('Redis unavailable for rate limiting — login will not be rate-limited', { attempt: times });
        return null;
      },
    });
    // Log Redis errors so they are visible in production monitoring
    this._redis.on('error', (err: Error) => {
      log.error('Redis connection error in rate limiter', { error: err.message });
    });
  }

  /**
   * Disconnects the Redis client so Jest can exit cleanly.
   */
  public async destroy(): Promise<void> {
    try {
      await this._redis.quit();
    } catch {
      // best-effort
    }
  }

  /**
   * Checks whether the given IP is allowed to attempt a login.
   *
   * @param ip - The request IP address.
   * @returns A rate-limit result.
   */
  public async checkByIp(ip: string): Promise<IRateLimitResult> {
    return this._check(ip, MAX_ATTEMPTS_PER_IP, `${KEY_PREFIX}ip:`, 'IP');
  }

  /**
   * Checks whether the given username/email is allowed to attempt a login.
   *
   * @param username - The login identifier.
   * @returns A rate-limit result.
   */
  public async checkByUsername(username: string): Promise<IRateLimitResult> {
    return this._check(username, MAX_ATTEMPTS_PER_USER, `${KEY_PREFIX}user:`, 'user');
  }

  /**
   * Resets counters for a successful login.
   *
   * @param ip       - The request IP address.
   * @param username - The login identifier.
   */
  public async recordSuccessfulLogin(ip: string, username: string): Promise<void> {
    try {
      await this._redis.del(`${KEY_PREFIX}ip:${ip}`);
      await this._redis.del(`${KEY_PREFIX}user:${username}`);
      await this._redis.del(`${KEY_PREFIX}lock:${ip}`);
      await this._redis.del(`${KEY_PREFIX}lock:${username}`);
    } catch (err: unknown) {
      this._log.warn('Failed to record successful login', { error: String(err) });
    }
  }

  /**
   * Core rate-limit check shared by IP and username checks.
   */
  private async _check(identifier: string, maxAttempts: number, keyPrefix: string, label: string): Promise<IRateLimitResult> {
    try {
      const lockKey = `${KEY_PREFIX}lock:${identifier}`;
      const countKey = `${keyPrefix}${identifier}`;

      // Check if currently locked
      const lockTtl = await this._redis.ttl(lockKey);
      if (lockTtl > 0) {
        return { allowed: false, retryAfterMs: lockTtl * 1000, remaining: 0 };
      }

      // Increment attempt counter
      const pipeline = this._redis.pipeline();
      pipeline.incr(countKey);
      pipeline.ttl(countKey);
      const results = await pipeline.exec();
      const count = (results?.[0]?.[1] as number) ?? 0;
      const ttl = (results?.[1]?.[1] as number) ?? -1;

      // Set window on first attempt
      if (ttl === -1) {
        await this._redis.expire(countKey, WINDOW_S);
      }

      const remaining = Math.max(0, maxAttempts - count);
      if (count > maxAttempts) {
        await this._redis.setex(lockKey, LOCK_DURATION_S, '1');
        this._log.warn(`Login rate limit exceeded for ${label}`, { identifier, count });
        return { allowed: false, retryAfterMs: LOCK_DURATION_S * 1000, remaining: 0 };
      }

      return { allowed: true, retryAfterMs: 0, remaining };
    } catch (err: unknown) {
      // Fail-open: if Redis is down, don't block legitimate users
      this._log.warn('Rate-limit check failed, allowing', { error: String(err), identifier });
      return { allowed: true, retryAfterMs: 0, remaining: -1 };
    }
  }
}
