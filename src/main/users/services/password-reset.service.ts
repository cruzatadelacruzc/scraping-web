import { inject, injectable } from 'inversify';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';
import { PrismaClient } from '@prisma/client';
import { TokenRepository } from '@users/repositories/token.repository';
import { TokenManagementService } from './token-management.service';
import { QueueContext } from '@shared/queue/queue-context';
import { EmailJobType, EMAIL_SEND_JOB } from '@users/queues/email.queues';

/**
 * Orchestrates the "forgot password" and "reset password" flows.
 *
 * Forgot-password always returns 200 (even for unknown emails) to prevent
 * email enumeration. Reset tokens are single-use, expire in 1 hour, and
 * are stored as bcrypt hashes.
 */
@injectable()
export class PasswordResetService {
  private static readonly TOKEN_EXPIRY_MINUTES = 60;

  public constructor(
    @inject(TYPES.Logger) private readonly _log: ILogger,
    @inject(TYPES.PrismaClient) private readonly _prisma: PrismaClient,
    @inject(TYPES.TokenRepository) private readonly _tokenRepo: TokenRepository,
    @inject(TYPES.TokenManagementService) private readonly _tokenMgmt: TokenManagementService,
    @inject(QueueContext) private readonly _queue: QueueContext,
  ) {
    this._log.context = PasswordResetService.name;
  }

  /**
   * Handles a forgot-password request. Generates a reset token and enqueues
   * an email if the email belongs to a registered user.
   *
   * Always returns successfully — the caller returns 200 regardless.
   *
   * @param email - The email from the forgot-password form.
   */
  public async requestReset(email: string): Promise<void> {
    const user = await this._prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Prevent email enumeration: log and return silently
      this._log.info('Password reset requested for unknown email', { email });
      return;
    }

    // Invalidate any existing unused reset tokens for this user
    const existing = await this._tokenRepo.findPasswordResetTokensByUserId(user.id);
    for (const t of existing) {
      await this._tokenRepo.markPasswordResetTokenUsed(t.id);
    }

    // Generate new token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(rawToken, 10);
    const expiresAt = new Date(Date.now() + PasswordResetService.TOKEN_EXPIRY_MINUTES * 60 * 1000);

    await this._tokenRepo.createPasswordResetToken({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    // Enqueue password reset email
    await this._queue.enqueue(EMAIL_SEND_JOB, {
      type: EmailJobType.PASSWORD_RESET,
      to: email,
      token: rawToken,
    });

    this._log.info('Password reset email enqueued', { userId: user.id });
  }

  /**
   * Resets a user's password using a valid reset token.
   *
   * @param rawToken    - The raw token from the reset link.
   * @param newPassword - The new password (plain text).
   * @throws {Error} if the token is invalid, expired, or already used.
   */
  public async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    // Find all unexpired, unused tokens across all users
    // Strategy: fetch tokens for users who have them (iterate via Prisma)
    const allTokens = await this._prisma.passwordResetToken.findMany({
      where: {
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      take: 50, // reasonable upper bound for concurrent pending resets
    });

    // Find the matching token
    const matched = await this._findMatchingToken(allTokens, rawToken);
    if (!matched) {
      this._log.warn('Invalid or expired reset token used');
      throw new Error('Token is invalid or has expired');
    }

    // Mark token as used
    await this._tokenRepo.markPasswordResetTokenUsed(matched.id);

    // Update password
    const newHash = await bcrypt.hash(newPassword, 10);
    await this._prisma.user.update({
      where: { id: matched.userId },
      data: { passwordHash: newHash },
    });

    // Revoke all refresh tokens (security: password changed)
    await this._tokenMgmt.revokeAllUserTokens(matched.userId);

    this._log.info('Password reset successfully', { userId: matched.userId });
  }

  /**
   * Changes the password for an authenticated user.
   *
   * @param userId          - The authenticated user's ID.
   * @param currentPassword - The current password for verification.
   * @param newPassword     - The new password.
   * @throws {Error} if the current password is incorrect.
   */
  public async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this._prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) {
      throw new Error('User not found or has no password set');
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      throw new Error('Current password is incorrect');
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await this._prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    // Revoke all refresh tokens (security)
    await this._tokenMgmt.revokeAllUserTokens(userId);

    this._log.info('Password changed successfully', { userId });
  }

  /** Compares the raw token against each stored bcrypt hash. */
  private async _findMatchingToken(
    tokens: { id: string; userId: string; tokenHash: string; expiresAt: Date }[],
    raw: string,
  ): Promise<{ id: string; userId: string } | null> {
    for (const t of tokens) {
      const match = await bcrypt.compare(raw, t.tokenHash);
      if (match) {
        return { id: t.id, userId: t.userId };
      }
    }
    return null;
  }
}
