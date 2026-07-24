import { inject, injectable } from 'inversify';
import bcrypt from 'bcryptjs';
import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';
import { PrismaClient } from '@prisma/client';
import { TokenManagementService } from './token-management.service';
import { QueueContext } from '@shared/queue/queue-context';
import { EmailJobType, EMAIL_SEND_JOB } from '@users/queues/email.queues';
import { AlarmRepository } from '@alarms/repositories/alarm.repository';

/**
 * Manages account soft-delete (deactivation), reactivation, and periodic
 * purge of expired accounts.
 *
 * On deactivation:
 * - `User.deletedAt` is set to the current timestamp.
 * - All of the user's alarms are paused (`enabled = false`).
 * - All refresh tokens are revoked.
 * - A confirmation email is enqueued.
 *
 * Accounts can be reactivated within 30 days by a SUPER_ADMIN.
 * On reactivation:
 * - `User.deletedAt` is cleared.
 * - All paused alarms are re-enabled (`enabled = true`).
 * - A confirmation email is enqueued.
 *
 * After 30 days, personal data is purged but account-level data (alarms,
 * scraping results) is preserved.
 */
@injectable()
export class AccountDeactivationService {
  private static readonly PURGE_DAYS = 30;

  public constructor(
    @inject(TYPES.Logger) private readonly _log: ILogger,
    @inject(TYPES.PrismaClient) private readonly _prisma: PrismaClient,
    @inject(TYPES.TokenManagementService) private readonly _tokenMgmt: TokenManagementService,
    @inject(QueueContext) private readonly _queue: QueueContext,
    @inject(AlarmRepository) private readonly _alarmRepo: AlarmRepository,
  ) {
    this._log.context = AccountDeactivationService.name;
  }

  /**
   * Deactivates a user account.
   *
   * @param userId   - The user to deactivate.
   * @param password - The user's current password for verification.
   * @throws {Error} if the password is incorrect or the user has no password set.
   */
  public async deactivate(userId: string, password: string): Promise<void> {
    const user = await this._prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });

    if (!user || !user.passwordHash) {
      throw new Error('User not found or has no password set');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new Error('Password is incorrect');
    }

    // Prevent super admins from self-deactivating
    const isSuperAdmin = user.roles.some(r => r.name === 'SUPER_ADMIN');
    if (isSuperAdmin) {
      throw new Error('Super admin accounts cannot be deactivated');
    }

    // Soft-delete user
    await this._prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });

    // Pause all alarms belonging to the user's account
    await this._prisma.alarm.updateMany({
      where: { accountId: user.accountId },
      data: { enabled: false },
    });

    // Revoke all refresh tokens
    await this._tokenMgmt.revokeAllUserTokens(userId);

    // Send deactivation email
    try {
      await this._queue.enqueue(EMAIL_SEND_JOB, {
        type: EmailJobType.ACCOUNT_DEACTIVATED,
        to: user.email,
      });
    } catch {
      // Non-critical: log and continue
      this._log.warn('Failed to enqueue deactivation email', { userId });
    }

    this._log.info('Account deactivated', { userId, accountId: user.accountId });
  }

  /**
   * Reactivates a previously deactivated user account.
   * Only callable by SUPER_ADMIN.
   *
   * @param userId - The user to reactivate.
   * @throws {Error} if the user is not deactivated or not found.
   */
  public async reactivate(userId: string): Promise<void> {
    const user = await this._prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.deletedAt) {
      throw new Error('User account is not deactivated');
    }

    await this._prisma.user.update({
      where: { id: userId },
      data: { deletedAt: null },
    });

    // Re-enable all alarms belonging to the user's account
    const result = await this._alarmRepo.setEnabledForAccount(user.accountId, true);
    if (result.count > 0) {
      this._log.info('Re-enabled alarms for account', { accountId: user.accountId, count: result.count });
    }

    // Send reactivation email
    try {
      await this._queue.enqueue(EMAIL_SEND_JOB, {
        type: EmailJobType.ACCOUNT_REACTIVATED,
        to: user.email,
      });
    } catch {
      this._log.warn('Failed to enqueue reactivation email', { userId });
    }

    this._log.info('Account reactivated', { userId });
  }

  /**
   * Hard-deletes personal data for accounts that have been deactivated for
   * longer than the purge window.
   *
   * Intended to run as a daily cron job.
   *
   * @returns The number of purged users.
   */
  public async purgeExpiredAccounts(): Promise<number> {
    const cutoff = new Date(Date.now() - AccountDeactivationService.PURGE_DAYS * 24 * 60 * 60 * 1000);

    const expiredUsers = await this._prisma.user.findMany({
      where: { deletedAt: { lte: cutoff } },
      select: { id: true },
    });

    let purged = 0;
    for (const user of expiredUsers) {
      await this._prisma.$transaction(async tx => {
        await tx.passwordResetToken.deleteMany({ where: { userId: user.id } });
        await tx.emailVerificationToken.deleteMany({ where: { userId: user.id } });
        await tx.refreshToken.deleteMany({ where: { userId: user.id } });
        await tx.loginAttempt.deleteMany({ where: { userId: user.id } });
        await tx.userIdentity.deleteMany({ where: { userId: user.id } });
        await tx.user.delete({ where: { id: user.id } });
      });
      purged++;
    }

    if (purged > 0) {
      this._log.info('Purged expired accounts', { count: purged });
    }

    return purged;
  }
}
