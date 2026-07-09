import { inject, injectable } from 'inversify';
import crypto from 'crypto';
import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';
import { TokenRepository } from '@users/repositories/token.repository';
import { TokenService } from '@shared/security/token.service';

/**
 * Manages refresh token lifecycle: issue, rotate, revoke, and theft detection.
 *
 * Refresh tokens are opaque 96-hex-char random strings stored as SHA-256 hashes
 * in the database. Each token belongs to a "family" for rotation tracking.
 *
 * On rotation the old token is marked `replacedBy` and a new token is issued.
 * If a token that was already replaced is presented again (possible theft),
 * the entire family is revoked.
 */
@injectable()
export class TokenManagementService {
  /** Refresh token lifetime in days. */
  private static readonly REFRESH_TOKEN_TTL_DAYS = 30;

  public constructor(
    @inject(TYPES.Logger) private readonly _log: ILogger,
    @inject(TYPES.TokenRepository) private readonly _tokenRepo: TokenRepository,
    @inject(TYPES.TokenService) private readonly _tokenService: TokenService,
  ) {
    this._log.context = TokenManagementService.name;
  }

  /**
   * Issues a new refresh token for the given user.
   *
   * @param userId - The user to issue the token for.
   * @returns The raw refresh token string to return to the client.
   */
  public async issueRefreshToken(userId: string): Promise<string> {
    const rawToken = crypto.randomBytes(48).toString('hex');
    const tokenHash = this._hashToken(rawToken);
    const family = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + TokenManagementService.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

    await this._tokenRepo.createRefreshToken({ userId, tokenHash, family, expiresAt });
    return rawToken;
  }

  /**
   * Rotates a refresh token: validates the incoming token, revokes it, and
   * issues a new one in the same family. If the incoming token was already
   * replaced (possible theft), the entire family is revoked.
   *
   * @param rawToken - The raw refresh token from the client.
   * @returns The new raw refresh token, or `null` if the token is invalid/revoked/theft-detected.
   */
  public async rotateRefreshToken(rawToken: string): Promise<string | null> {
    const tokenHash = this._hashToken(rawToken);
    const stored = await this._tokenRepo.findRefreshTokenByHash(tokenHash);

    if (!stored) {
      this._log.warn('Refresh token not found or expired');
      return null;
    }

    // Theft detection: if this token was already replaced, revoke the whole family
    if (stored.replacedBy) {
      this._log.warn('Refresh token reuse detected — revoking entire family', {
        userId: stored.userId,
        family: stored.family,
        tokenId: stored.id,
      });
      if (stored.family) {
        await this._tokenRepo.revokeRefreshTokenFamily(stored.family);
      }
      return null;
    }

    // Issue new token in the same family
    const newRawToken = crypto.randomBytes(48).toString('hex');
    const newTokenHash = this._hashToken(newRawToken);
    const expiresAt = new Date(Date.now() + TokenManagementService.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

    const newToken = await this._tokenRepo.createRefreshToken({
      userId: stored.userId,
      tokenHash: newTokenHash,
      family: stored.family ?? crypto.randomUUID(),
      expiresAt,
    });

    // Mark old token as replaced
    await this._tokenRepo.replaceRefreshToken(stored.id, newToken.id);

    return newRawToken;
  }

  /**
   * Revokes all active refresh tokens for a user (e.g. on password change or
   * account deactivation).
   *
   * @param userId - The user whose tokens should be revoked.
   */
  public async revokeAllUserTokens(userId: string): Promise<void> {
    await this._tokenRepo.revokeAllUserRefreshTokens(userId);
    this._log.info('All refresh tokens revoked for user', { userId });
  }

  /**
   * Revokes a single refresh token by its raw value.
   *
   * @param rawToken - The raw refresh token to revoke.
   */
  public async revokeRefreshToken(rawToken: string): Promise<void> {
    const tokenHash = this._hashToken(rawToken);
    const stored = await this._tokenRepo.findRefreshTokenByHash(tokenHash);
    if (stored) {
      await this._tokenRepo.revokeRefreshToken(stored.id);
    }
  }

  /** SHA-256 hashes a raw token for storage. */
  private _hashToken(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }
}
