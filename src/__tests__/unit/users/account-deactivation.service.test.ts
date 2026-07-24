import 'reflect-metadata';
import bcrypt from 'bcryptjs';
import { AccountDeactivationService } from '@users/services/account-deactivation.service';
import { AlarmRepository } from '@alarms/repositories/alarm.repository';
import { TokenManagementService } from '@users/services/token-management.service';

jest.mock('bcryptjs', () => ({
  compare: jest.fn().mockResolvedValue(true),
}));

describe('AccountDeactivationService', () => {
  let service: AccountDeactivationService;
  let prismaMock: any;
  let alarmRepoMock: jest.Mocked<AlarmRepository>;
  let tokenMgmtMock: jest.Mocked<TokenManagementService>;
  let queueMock: any;
  const loggerMock = { debug: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn(), context: '' } as any;

  const accountId = 'acc-1';
  const userId = 'user-1';
  const defaultUser = {
    id: userId,
    accountId,
    email: 'test@example.com',
    username: 'testuser',
    passwordHash: 'hashed-password',
    roles: [{ id: 'r1', name: 'ACCOUNT_OWNER' }],
    deletedAt: null,
  };

  const deactivatedUser = {
    ...defaultUser,
    deletedAt: new Date('2024-01-15'),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    prismaMock = {
      $transaction: jest.fn(),
    };

    alarmRepoMock = {
      setEnabledForAccount: jest.fn(),
    } as unknown as jest.Mocked<AlarmRepository>;

    tokenMgmtMock = {
      revokeAllUserTokens: jest.fn(),
      issueRefreshToken: jest.fn(),
      rotateRefreshToken: jest.fn(),
      revokeRefreshToken: jest.fn(),
    } as unknown as jest.Mocked<TokenManagementService>;

    queueMock = {
      enqueue: jest.fn().mockResolvedValue('job-1'),
    };

    service = new AccountDeactivationService(loggerMock, prismaMock as any, tokenMgmtMock, queueMock, alarmRepoMock);
  });

  // ---------------------------------------------------------------------------
  // reactivate
  // ---------------------------------------------------------------------------
  describe('reactivate', () => {
    it('should reactivate user and re-enable alarms', async () => {
      prismaMock.user = {
        findUnique: jest.fn().mockResolvedValue(deactivatedUser),
        update: jest.fn().mockResolvedValue({ ...deactivatedUser, deletedAt: null }),
      };
      alarmRepoMock.setEnabledForAccount.mockResolvedValue({ count: 3 });

      await service.reactivate(userId);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { id: userId } });
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { deletedAt: null },
      });
      expect(alarmRepoMock.setEnabledForAccount).toHaveBeenCalledWith(accountId, true);
      expect(loggerMock.info).toHaveBeenCalledWith('Re-enabled alarms for account', {
        accountId,
        count: 3,
      });
      expect(queueMock.enqueue).toHaveBeenCalled();
    });

    it('should not log count when there are no alarms to re-enable', async () => {
      prismaMock.user = {
        findUnique: jest.fn().mockResolvedValue(deactivatedUser),
        update: jest.fn().mockResolvedValue({ ...deactivatedUser, deletedAt: null }),
      };
      alarmRepoMock.setEnabledForAccount.mockResolvedValue({ count: 0 });

      await service.reactivate(userId);

      expect(alarmRepoMock.setEnabledForAccount).toHaveBeenCalledWith(accountId, true);
      // The info log should appear only for "Account reactivated", not for "Re-enabled alarms"
      const infoCalls = loggerMock.info.mock.calls.filter((call: string[]) => call[0] === 'Re-enabled alarms for account');
      expect(infoCalls).toHaveLength(0);
      expect(queueMock.enqueue).toHaveBeenCalled();
    });

    it('should re-enable alarms before sending reactivation email', async () => {
      let alarmRepoCalled = false;
      let emailEnqueued = false;

      prismaMock.user = {
        findUnique: jest.fn().mockResolvedValue(deactivatedUser),
        update: jest.fn().mockResolvedValue({ ...deactivatedUser, deletedAt: null }),
      };
      alarmRepoMock.setEnabledForAccount.mockImplementation(async () => {
        alarmRepoCalled = true;
        expect(emailEnqueued).toBe(false);
        return { count: 2 };
      });
      queueMock.enqueue.mockImplementation(async () => {
        emailEnqueued = true;
        expect(alarmRepoCalled).toBe(true);
      });

      await service.reactivate(userId);

      expect(alarmRepoCalled).toBe(true);
      expect(emailEnqueued).toBe(true);
    });

    it('should throw error if user is not found', async () => {
      prismaMock.user = {
        findUnique: jest.fn().mockResolvedValue(null),
      };

      await expect(service.reactivate('nonexistent')).rejects.toThrow('User not found');
      expect(alarmRepoMock.setEnabledForAccount).not.toHaveBeenCalled();
      expect(queueMock.enqueue).not.toHaveBeenCalled();
    });

    it('should throw error if user is not deactivated', async () => {
      prismaMock.user = {
        findUnique: jest.fn().mockResolvedValue(defaultUser),
        update: jest.fn(),
      };

      await expect(service.reactivate(userId)).rejects.toThrow('User account is not deactivated');
      expect(prismaMock.user.update).not.toHaveBeenCalled();
      expect(alarmRepoMock.setEnabledForAccount).not.toHaveBeenCalled();
      expect(queueMock.enqueue).not.toHaveBeenCalled();
    });

    it('should still reactivate even if email enqueue fails', async () => {
      prismaMock.user = {
        findUnique: jest.fn().mockResolvedValue(deactivatedUser),
        update: jest.fn().mockResolvedValue({ ...deactivatedUser, deletedAt: null }),
      };
      alarmRepoMock.setEnabledForAccount.mockResolvedValue({ count: 1 });
      queueMock.enqueue.mockRejectedValue(new Error('Queue unavailable'));

      await expect(service.reactivate(userId)).resolves.toBeUndefined();

      expect(alarmRepoMock.setEnabledForAccount).toHaveBeenCalledWith(accountId, true);
      expect(loggerMock.warn).toHaveBeenCalledWith('Failed to enqueue reactivation email', { userId });
      expect(loggerMock.info).toHaveBeenCalledWith('Account reactivated', { userId });
    });
  });

  // ---------------------------------------------------------------------------
  // deactivate
  // ---------------------------------------------------------------------------
  describe('deactivate', () => {
    it('should deactivate user and pause alarms', async () => {
      prismaMock.user = {
        findUnique: jest.fn().mockResolvedValue(defaultUser),
        update: jest.fn().mockResolvedValue({ ...defaultUser, deletedAt: new Date() }),
      };
      prismaMock.alarm = {
        updateMany: jest.fn().mockResolvedValue({ count: 3 }),
      };
      tokenMgmtMock.revokeAllUserTokens.mockResolvedValue(undefined);

      await service.deactivate(userId, 'hashed-password');

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        include: { roles: true },
      });
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { deletedAt: expect.any(Date) },
      });
      expect(prismaMock.alarm.updateMany).toHaveBeenCalledWith({
        where: { accountId },
        data: { enabled: false },
      });
      expect(tokenMgmtMock.revokeAllUserTokens).toHaveBeenCalledWith(userId);
      expect(queueMock.enqueue).toHaveBeenCalled();
    });

    it('should throw error if user is not found or has no password', async () => {
      prismaMock.user = {
        findUnique: jest.fn().mockResolvedValue(null),
      };

      await expect(service.deactivate(userId, 'password')).rejects.toThrow('User not found or has no password set');
    });

    it('should throw error if password is incorrect', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      prismaMock.user = {
        findUnique: jest.fn().mockResolvedValue(defaultUser),
      };

      await expect(service.deactivate(userId, 'wrong-password')).rejects.toThrow('Password is incorrect');
    });

    it('should throw error if user is SUPER_ADMIN', async () => {
      const superAdminUser = {
        ...defaultUser,
        roles: [{ id: 'r2', name: 'SUPER_ADMIN' }],
      };
      prismaMock.user = {
        findUnique: jest.fn().mockResolvedValue(superAdminUser),
      };

      await expect(service.deactivate(userId, 'hashed-password')).rejects.toThrow('Super admin accounts cannot be deactivated');
    });
  });

  // ---------------------------------------------------------------------------
  // purgeExpiredAccounts
  // ---------------------------------------------------------------------------
  describe('purgeExpiredAccounts', () => {
    it('should purge expired accounts', async () => {
      const expiredUser = { id: 'expired-1' };
      const txMock = {
        passwordResetToken: { deleteMany: jest.fn() },
        emailVerificationToken: { deleteMany: jest.fn() },
        refreshToken: { deleteMany: jest.fn() },
        loginAttempt: { deleteMany: jest.fn() },
        userIdentity: { deleteMany: jest.fn() },
        user: { delete: jest.fn() },
      };
      prismaMock.user = {
        findMany: jest.fn().mockResolvedValue([expiredUser]),
      };
      prismaMock.$transaction.mockImplementation(async (fn: any) => fn(txMock));

      const count = await service.purgeExpiredAccounts();

      expect(count).toBe(1);
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });
  });
});
