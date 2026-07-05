import { inject, injectable } from 'inversify';
import { customAlphabet } from 'nanoid';
import { BotLinkAction } from '@prisma/client';
import jwt from 'jsonwebtoken';
import Redis from 'ioredis';
import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';
import { LinkCodeRepository } from '@bots/repositories/link-code.repository';
import { LinkAuditRepository } from '@bots/repositories/link-audit.repository';
import { BotConversationRepository } from '@bots/repositories/bot-conversation.repository';
import { BotRateLimitService } from '@bots/services/rate-limit.service';
import { BotMenuService } from '@bots/services/bot-menu.service';
import { InvalidLinkCodeError } from '@bots/errors/invalid-link-code.error';
import { RateLimitError } from '@bots/errors/rate-limit.error';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Link token TTL in minutes (how long the deep link is clickable). */
const LINK_TOKEN_TTL_MINUTES = 5;

/** Link lifetime in days (how long the link stays valid after confirmation). */
const LINK_LIFETIME_DAYS = 30;

/** Redis key prefix for nonce tracking. */
const NONCE_KEY_PREFIX = 'bot:nonce:';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Payload embedded in the signed link token. */
export interface ILinkTokenPayload {
  sub: string; // userId
  accountId: string;
  purpose: 'bot-link';
  provider: string; // "telegram" | "whatsapp"
  jti: string; // unique nonce (prevents replay)
}

/** Returned to the web UI after token generation. */
export interface IGeneratedLinkToken {
  token: string;
  deepLink: string;
  expiresAt: string; // ISO
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const generateJti = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 16);

/** Builds a deep link URL for the given provider and token. */
function buildDeepLink(provider: string, token: string): string {
  if (provider === 'telegram') {
    const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? 'BazaarSentinelBot';
    return `https://t.me/${botUsername}?start=${token}`;
  }
  if (provider === 'whatsapp') {
    const phone = process.env.WHATSAPP_PHONE_NUMBER;
    if (!phone) return '';
    return `https://wa.me/${phone}?text=${encodeURIComponent(token)}`;
  }
  return '';
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@injectable()
export class LinkCodeService {
  private readonly _tokenTtlMinutes: number;
  private readonly _linkLifetimeDays: number;
  private readonly _redis: Redis;
  private readonly _jwtSecret: string;

  public constructor(
    @inject(TYPES.Logger) private readonly _log: ILogger,
    @inject(TYPES.LinkCodeRepository) private readonly _repo: LinkCodeRepository,
    @inject(TYPES.LinkAuditRepository) private readonly _auditRepo: LinkAuditRepository,
    @inject(TYPES.BotRateLimitService) private readonly _rateLimit: BotRateLimitService,
    @inject(TYPES.BotConversationRepository) private readonly _convRepo: BotConversationRepository,
    @inject(TYPES.BotMenuService) private readonly _menu: BotMenuService,
  ) {
    this._log.context = LinkCodeService.name;
    this._tokenTtlMinutes = parseInt(process.env.BOT_LINK_CODE_TTL_MINUTES ?? String(LINK_TOKEN_TTL_MINUTES), 10);
    this._linkLifetimeDays = parseInt(process.env.BOT_LINK_LIFETIME_DAYS ?? String(LINK_LIFETIME_DAYS), 10);
    this._jwtSecret = process.env.JWT_SECRET!;

    // Reuse Redis URL for nonce tracking.
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
  // Token generation (API side) — One-Time Deep Link
  // ---------------------------------------------------------------------------

  /**
   * Generates a signed JWT link token and the corresponding deep link URL.
   *
   * The token is self-validating (JWT signature + expiry). No DB storage needed
   * for validation — only the nonce (jti) is tracked in Redis for replay prevention.
   *
   * @param userId    — the authenticated user.
   * @param accountId — tenant id.
   * @param provider  — "telegram" or "whatsapp".
   * @param ipAddress — client IP for audit.
   * @param userAgent — client User-Agent for audit.
   * @returns the generated token, deep link URL, and expiry.
   */
  public async generate(
    userId: string,
    accountId: string,
    provider: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<IGeneratedLinkToken> {
    // Rate-limit check
    const limit = await this._rateLimit.checkCodeGeneration(userId);
    if (!limit.allowed) {
      throw new RateLimitError(userId, limit.retryAfterMs);
    }

    const jti = generateJti();
    const payload: ILinkTokenPayload = {
      sub: userId,
      accountId,
      purpose: 'bot-link',
      provider,
      jti,
    };

    const token = jwt.sign(payload, this._jwtSecret, {
      expiresIn: `${this._tokenTtlMinutes}m`,
    });

    const deepLink = buildDeepLink(provider, token);
    const expiresAt = new Date(Date.now() + this._tokenTtlMinutes * 60 * 1000);

    // Persist a tracking record (for admin visibility / debugging)
    await this._repo.create({
      code: jti,
      userId,
      accountId,
      expiresAt,
    });

    // Audit log
    await this._auditRepo.log({
      accountId,
      userId,
      action: BotLinkAction.CODE_GENERATED,
      code: jti,
      provider,
      ipAddress,
      userAgent,
    });

    this._log.info('Link token generated', { userId, provider, jti });

    return { token, deepLink, expiresAt: expiresAt.toISOString() };
  }

  // ---------------------------------------------------------------------------
  // Token verification (bot side) — Backend Verification
  // ---------------------------------------------------------------------------

  /**
   * Verifies a link token received by the bot (from a deep link click).
   *
   * Steps:
   * 1. Verify JWT signature and expiry
   * 2. Check Redis nonce hasn't been consumed (replay prevention)
   * 3. Link the BotConversation to the user
   * 4. Mark nonce as consumed in Redis
   * 5. Write audit logs
   *
   * @param token     — the raw JWT token string.
   * @param chatId    — the externalId of the chat (from ctx.from).
   * @param provider  — "telegram" or "whatsapp".
   * @returns true if the link was successful.
   * @throws {InvalidLinkCodeError} if token is invalid, expired, or already used.
   */
  public async verifyAndLink(token: string, chatId: string, provider: string): Promise<boolean> {
    // Rate-limit check per chat
    const limit = await this._rateLimit.checkValidationAttempt(chatId);
    if (!limit.allowed) {
      throw new RateLimitError(chatId, limit.retryAfterMs);
    }

    // 1. Verify JWT
    let payload: ILinkTokenPayload;
    try {
      payload = jwt.verify(token, this._jwtSecret, {
        algorithms: ['HS256'],
      }) as ILinkTokenPayload;
    } catch {
      throw new InvalidLinkCodeError('token_invalid');
    }

    if (payload.purpose !== 'bot-link') {
      throw new InvalidLinkCodeError('wrong_purpose');
    }

    // Validate provider matches the chat type (prevents cross-provider token misuse)
    if (payload.provider !== provider && provider !== 'unknown') {
      this._log.warn('Provider mismatch', { tokenProvider: payload.provider, chatProvider: provider });
      throw new InvalidLinkCodeError('provider_mismatch');
    }

    // 2. Check nonce hasn't been consumed (Redis SETNX)
    const nonceKey = `${NONCE_KEY_PREFIX}${payload.jti}`;
    let acquired: boolean;
    try {
      const result = await this._redis.set(nonceKey, payload.sub, 'EX', this._tokenTtlMinutes * 60, 'NX');
      acquired = result === 'OK';
    } catch {
      // Redis down — fall back to DB check
      const existing = await this._repo.findByCode(payload.jti);
      acquired = !existing?.consumedAt;
    }

    if (!acquired) {
      this._log.warn('Replay attempt detected', { jti: payload.jti, chatId });
      throw new InvalidLinkCodeError('already_consumed');
    }

    // 3. Link the conversation
    this._rateLimit.recordSuccessfulValidation(chatId).catch(() => {
      /* best-effort */
    });

    const conv = await this._convRepo.findByExternalId(payload.provider, chatId);
    if (!conv) {
      this._log.warn('No conversation record found for chat', { chatId, provider: payload.provider });
      throw new InvalidLinkCodeError('no_conversation');
    }

    const linkExpiresAt = new Date(Date.now() + this._linkLifetimeDays * 24 * 60 * 60 * 1000);
    await this._convRepo.linkUser(conv.id, payload.sub, linkExpiresAt);

    // Mark tracking record as consumed
    const trackingRecord = await this._repo.findByCode(payload.jti);
    if (trackingRecord) {
      await this._repo.markConsumed(trackingRecord.id);
    }

    // Update Telegram menu
    await this._menu.applyCommands(chatId, true);

    // 4. Audit logs
    await this._auditRepo.log({
      accountId: payload.accountId,
      userId: payload.sub,
      action: BotLinkAction.LINKED,
      code: payload.jti,
      provider: payload.provider,
      externalId: chatId,
    });

    this._log.info('User linked via deep link token', {
      userId: payload.sub,
      provider: payload.provider,
      chatId,
      linkExpiresAt: linkExpiresAt.toISOString(),
    });

    return true;
  }

  // ---------------------------------------------------------------------------
  // Periodic Revalidation
  // ---------------------------------------------------------------------------

  /**
   * Checks whether the user's link is still valid (within the 30-day lifetime).
   * Called by the auth guard before each gated bot command.
   *
   * @returns true if the link is still active.
   */
  public async isLinkValid(userId: string): Promise<boolean> {
    const conversations = await this._convRepo.findByUserId(userId);
    if (conversations.length === 0) return false;

    // Check the most recently linked conversation
    const linked = conversations.find(c => c.linkExpiresAt !== null);
    if (!linked?.linkExpiresAt) return false;

    return linked.linkExpiresAt > new Date();
  }

  /**
   * Renews the link for another lifetime period.
   * Called when the user successfully authenticates or on explicit renewal.
   */
  public async renewLink(userId: string): Promise<void> {
    const conversations = await this._convRepo.findByUserId(userId);
    const newExpiry = new Date(Date.now() + this._linkLifetimeDays * 24 * 60 * 60 * 1000);

    for (const conv of conversations) {
      if (conv.userId === userId) {
        await this._convRepo.updateLinkExpiry(conv.id, newExpiry);
      }
    }

    this._log.info('Link renewed', { userId, newExpiry: newExpiry.toISOString() });
  }

  // ---------------------------------------------------------------------------
  // Unlinking
  // ---------------------------------------------------------------------------

  /**
   * Unlinks all bot conversations for a user.
   */
  public async unlink(userId: string, accountId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    const conversations = await this._convRepo.findByUserId(userId);

    for (const conv of conversations) {
      await this._convRepo.unlinkUser(conv.id);
      await this._menu.applyCommands(conv.externalId, false);

      await this._auditRepo.log({
        accountId,
        userId,
        action: BotLinkAction.UNLINKED,
        provider: conv.provider,
        externalId: conv.externalId,
        ipAddress,
        userAgent,
      });

      this._log.info('User unlinked', { userId, provider: conv.provider, externalId: conv.externalId });
    }
  }

  // ---------------------------------------------------------------------------
  // Legacy (keep for backward compat during transition)
  // ---------------------------------------------------------------------------

  /**
   * Legacy read-only code check. Does NOT mark VALIDATED.
   *
   * @deprecated Use {@link verifyAndLink} for the JWT-based flow.
   */
  public async check(code: string): Promise<unknown | null> {
    const record = await this._repo.findByCode(code);
    if (!record) return null;
    if (record.consumedAt) return null;
    if (record.expiresAt < new Date()) return null;
    return record;
  }

  /**
   * Legacy: marks a link code as consumed.
   *
   * @deprecated Use {@link verifyAndLink} for the JWT-based flow.
   */
  public async consume(id: string): Promise<unknown> {
    this._log.debug('Consuming link code (legacy)', { id });
    return this._repo.markConsumed(id);
  }

  /** @deprecated Use {@link verifyAndLink} instead. */
  public async validateAndLink(code: string, chatId: string | number): Promise<boolean> {
    // Try JWT verification first, fall back to legacy code lookup
    try {
      return await this.verifyAndLink(code, String(chatId), 'unknown');
    } catch {
      // Legacy fallback
      const record = await this._repo.findByCode(code);
      if (!record || record.consumedAt || record.expiresAt < new Date()) return false;
      await this._repo.markConsumed(record.id);
      await this._menu.applyCommands(chatId, true);
      this._log.info('User linked via bot (legacy code)', { userId: record.userId, chatId });
      return true;
    }
  }
}
