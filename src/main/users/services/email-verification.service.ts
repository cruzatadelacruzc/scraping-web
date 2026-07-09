import { inject, injectable } from 'inversify';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';
import { PrismaClient } from '@prisma/client';
import { TokenRepository } from '@users/repositories/token.repository';
import { QueueContext } from '@shared/queue/queue-context';
import { EmailJobType, EMAIL_SEND_JOB } from '@users/queues/email.queues';

/**
 * Manages email verification flows: sending verification emails and
 * confirming tokens. Supports both initial email verification (after
 * registration) and email change confirmation.
 */
@injectable()
export class EmailVerificationService {
  private static readonly TOKEN_EXPIRY_HOURS = 24;

  public constructor(
    @inject(TYPES.Logger) private readonly _log: ILogger,
    @inject(TYPES.PrismaClient) private readonly _prisma: PrismaClient,
    @inject(TYPES.TokenRepository) private readonly _tokenRepo: TokenRepository,
    @inject(QueueContext) private readonly _queue: QueueContext,
  ) {
    this._log.context = EmailVerificationService.name;
  }

  /**
   * Generates a verification token and enqueues a verification email.
   *
   * @param userId - The user to verify.
   * @param email  - The email address to verify (may differ from current email
   *                 in change-email scenarios).
   */
  public async requestVerification(userId: string, email: string): Promise<void> {
    // Invalidate any existing unused verification tokens for this user
    const existing = await this._tokenRepo.findEmailVerificationTokensByUserId(userId);
    for (const t of existing) {
      await this._tokenRepo.markEmailVerificationTokenUsed(t.id);
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(rawToken, 10);
    const expiresAt = new Date(Date.now() + EmailVerificationService.TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    await this._tokenRepo.createEmailVerificationToken({
      userId,
      email,
      tokenHash,
      expiresAt,
    });

    await this._queue.enqueue(EMAIL_SEND_JOB, {
      type: EmailJobType.EMAIL_VERIFICATION,
      to: email,
      token: rawToken,
    });

    this._log.info('Email verification enqueued', { userId, email });
  }

  /**
   * Verifies an email using the token from the verification link.
   *
   * If the token's email differs from the user's current email, the user's
   * email is updated (change-email scenario).
   *
   * @param rawToken - The raw token from the verification link.
   * @throws {Error} if the token is invalid, expired, or already used.
   */
  public async verifyEmail(rawToken: string): Promise<void> {
    const allTokens = await this._prisma.emailVerificationToken.findMany({
      where: {
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const matched = await this._findMatchingToken(allTokens, rawToken);
    if (!matched) {
      this._log.warn('Invalid or expired verification token used');
      throw new Error('Verification token is invalid or has expired');
    }

    // Mark token as used
    await this._tokenRepo.markEmailVerificationTokenUsed(matched.id);

    // Update user
    const updateData: Record<string, unknown> = { emailVerified: true };
    if (matched.email) {
      updateData.email = matched.email;
    }

    await this._prisma.user.update({
      where: { id: matched.userId },
      data: updateData,
    });

    this._log.info('Email verified successfully', { userId: matched.userId, email: matched.email });
  }

  private async _findMatchingToken(
    tokens: { id: string; userId: string; tokenHash: string; email: string }[],
    raw: string,
  ): Promise<{ id: string; userId: string; email: string } | null> {
    for (const t of tokens) {
      const match = await bcrypt.compare(raw, t.tokenHash);
      if (match) {
        return { id: t.id, userId: t.userId, email: t.email };
      }
    }
    return null;
  }
}
