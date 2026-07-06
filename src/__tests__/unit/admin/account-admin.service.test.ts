import { AccountAdminService } from '@admin/services/account-admin.service';
import { ILogger } from '@shared/logger.interface';

describe('AccountAdminService', () => {
  let service: AccountAdminService;
  let accountRepoMock: Record<string, jest.Mock>;
  let prismaMock: Record<string, Record<string, jest.Mock>>;
  let loggerMock: ILogger;

  const mockAccount = {
    id: 'acc-1',
    name: 'Test Account',
    settings: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    users: [{ id: 'user-1' }, { id: 'user-2' }],
  };

  beforeEach(() => {
    accountRepoMock = {
      findAll: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    prismaMock = {
      accountSubscription: {
        groupBy: jest.fn(),
        count: jest.fn(),
      },
      alarm: {
        groupBy: jest.fn(),
        count: jest.fn(),
      },
    };

    loggerMock = {
      set context(_value: string) {},
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      log: jest.fn(),
    } as unknown as ILogger;

    service = new AccountAdminService(accountRepoMock as never, prismaMock as never, loggerMock);
  });

  // =========================================================================
  // getAll
  // =========================================================================
  describe('getAll', () => {
    it('should return paginated accounts with counts', async () => {
      accountRepoMock.findAll.mockResolvedValue([mockAccount]);
      prismaMock.accountSubscription.groupBy.mockResolvedValue([{ accountId: 'acc-1', _count: { id: 3 } }]);
      prismaMock.alarm.groupBy.mockResolvedValue([{ accountId: 'acc-1', _count: { id: 5 } }]);

      const result = await service.getAll(0, 10);

      expect(result.total).toBe(1);
      expect(result.skip).toBe(0);
      expect(result.limit).toBe(10);
      expect(result.accounts).toHaveLength(1);
      expect(result.accounts[0].id).toBe('acc-1');
      expect(result.accounts[0].userCount).toBe(2);
      expect(result.accounts[0].subscriptionCount).toBe(3);
      expect(result.accounts[0].alarmCount).toBe(5);
    });

    it('should return empty accounts when no accounts exist', async () => {
      accountRepoMock.findAll.mockResolvedValue([]);

      const result = await service.getAll(0, 10);

      expect(result.accounts).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should handle pagination correctly', async () => {
      const accounts = Array.from({ length: 5 }, (_, i) => ({
        ...mockAccount,
        id: `acc-${i + 1}`,
        users: [{ id: `user-${i + 1}` }],
      }));
      accountRepoMock.findAll.mockResolvedValue(accounts);
      prismaMock.accountSubscription.groupBy.mockResolvedValue([]);
      prismaMock.alarm.groupBy.mockResolvedValue([]);

      const result = await service.getAll(1, 2);

      expect(result.total).toBe(5);
      expect(result.accounts).toHaveLength(2);
      expect(result.accounts[0].id).toBe('acc-2');
      expect(result.accounts[1].id).toBe('acc-3');
    });
  });

  // =========================================================================
  // getById
  // =========================================================================
  describe('getById', () => {
    it('should return account with counts when found', async () => {
      accountRepoMock.findById.mockResolvedValue(mockAccount);
      prismaMock.accountSubscription.count.mockResolvedValue(3);
      prismaMock.alarm.count.mockResolvedValue(5);

      const result = await service.getById('acc-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('acc-1');
      expect(result!.name).toBe('Test Account');
      expect(result!.userCount).toBe(2);
      expect(result!.subscriptionCount).toBe(3);
      expect(result!.alarmCount).toBe(5);
      expect(prismaMock.accountSubscription.count).toHaveBeenCalledWith({ where: { accountId: 'acc-1' } });
      expect(prismaMock.alarm.count).toHaveBeenCalledWith({ where: { accountId: 'acc-1' } });
    });

    it('should return null when account not found', async () => {
      accountRepoMock.findById.mockResolvedValue(null);

      const result = await service.getById('bad-id');

      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // update
  // =========================================================================
  describe('update', () => {
    it('should update an account and return updated data', async () => {
      const updatedAccount = {
        ...mockAccount,
        name: 'Updated Name',
      };
      accountRepoMock.update.mockResolvedValue(updatedAccount);

      const result = await service.update('acc-1', { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
      expect(accountRepoMock.update).toHaveBeenCalledWith('acc-1', { name: 'Updated Name' });
    });
  });

  // =========================================================================
  // delete
  // =========================================================================
  describe('delete', () => {
    it('should delete an account by id', async () => {
      accountRepoMock.delete.mockResolvedValue(undefined);

      await service.delete('acc-1');

      expect(accountRepoMock.delete).toHaveBeenCalledWith('acc-1');
    });

    it('should propagate errors', async () => {
      const error = new Error('Delete failed');
      accountRepoMock.delete.mockRejectedValue(error);

      await expect(service.delete('bad-id')).rejects.toThrow('Delete failed');
    });
  });
});
