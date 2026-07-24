import 'reflect-metadata';
import { AccountService } from '@users/services/account.service';
import { AccountRepository } from '@users/repositories/account.repository';
import { AccountMapper } from '@users/mappers/account.mapper';
import { AccountDTO } from '@users/dto/account.dto';
import { SubscriptionsService } from '@users/services/account-subscriptions.service';
import { PlanRepository } from '@users/repositories/plan.repository';
import { PlanType } from '@prisma/client';

describe('AccountService', () => {
  let accountService: AccountService;
  let accountRepo: jest.Mocked<AccountRepository>;
  let accountMapper: jest.Mocked<AccountMapper>;
  let subscriptionsService: jest.Mocked<SubscriptionsService>;
  let planRepository: jest.Mocked<PlanRepository>;
  const loggerMock = { debug: jest.fn(), warn: jest.fn(), error: jest.fn(), context: '' } as any;

  const dbAccount = {
    id: 'acc-1',
    name: 'Test Account',
    settings: { theme: 'dark' },
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-02'),
    users: [{ id: 'u1' }],
  } as any;

  const trialPlan = {
    id: 'plan-trial-1',
    type: PlanType.TRIAL,
    name: 'Trial',
    price: 0,
    features: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  const mockSubscription = {
    id: 'sub-1',
    accountId: 'acc-1',
    planId: 'plan-trial-1',
    status: 'TRIALING',
    periodStart: new Date(),
    periodEnd: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();

    accountRepo = {
      exists: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<AccountRepository>;

    accountMapper = {
      toCreateInput: jest.fn().mockReturnValue({ name: 'Test Account', settings: { theme: 'dark' } }),
      toDTO: jest
        .fn()
        .mockImplementation(model =>
          model ? new AccountDTO('Test Account', 'acc-1', { theme: 'dark' }, new Date('2025-01-01'), new Date('2025-01-02')) : null,
        ),
    } as unknown as jest.Mocked<AccountMapper>;

    subscriptionsService = {
      create: jest.fn(),
    } as unknown as jest.Mocked<SubscriptionsService>;

    planRepository = {
      findByType: jest.fn(),
    } as unknown as jest.Mocked<PlanRepository>;

    accountService = new AccountService(loggerMock, accountRepo, accountMapper, subscriptionsService, planRepository);
  });

  describe('register', () => {
    it('should create an account and return DTO', async () => {
      const dto = new AccountDTO('Test Account', undefined, { theme: 'dark' });
      accountRepo.create.mockResolvedValue(dbAccount);
      planRepository.findByType.mockResolvedValue(trialPlan);
      subscriptionsService.create.mockResolvedValue(mockSubscription);

      const result = await accountService.register(dto);

      expect(result.name).toBe('Test Account');
      expect(result.id).toBe('acc-1');
      expect(accountMapper.toCreateInput).toHaveBeenCalledWith(dto);
      expect(accountRepo.create).toHaveBeenCalled();
    });

    it('should auto-assign TRIAL subscription when TRIAL plan exists', async () => {
      const dto = new AccountDTO('Test Account', undefined, { theme: 'dark' });
      accountRepo.create.mockResolvedValue(dbAccount);
      planRepository.findByType.mockResolvedValue(trialPlan);
      subscriptionsService.create.mockResolvedValue(mockSubscription);

      await accountService.register(dto);

      expect(planRepository.findByType).toHaveBeenCalledWith(PlanType.TRIAL);
      expect(subscriptionsService.create).toHaveBeenCalledWith('acc-1', 'plan-trial-1', 'TRIALING', expect.any(Date));
      expect(loggerMock.debug).toHaveBeenCalledWith(
        'TRIAL subscription assigned to account',
        expect.objectContaining({ accountId: 'acc-1', planId: 'plan-trial-1' }),
      );
    });

    it('should log a warning and continue when TRIAL plan does not exist (fail-open)', async () => {
      const dto = new AccountDTO('Test Account', undefined, { theme: 'dark' });
      accountRepo.create.mockResolvedValue(dbAccount);
      planRepository.findByType.mockResolvedValue(null);

      const result = await accountService.register(dto);

      expect(result.name).toBe('Test Account');
      expect(result.id).toBe('acc-1');
      expect(planRepository.findByType).toHaveBeenCalledWith(PlanType.TRIAL);
      expect(subscriptionsService.create).not.toHaveBeenCalled();
      expect(loggerMock.warn).toHaveBeenCalledWith(
        'TRIAL plan not found — skipping trial subscription assignment',
        expect.objectContaining({ accountId: 'acc-1' }),
      );
    });

    it('should create account even if subscription creation throws (fail-open)', async () => {
      const dto = new AccountDTO('Test Account', undefined, { theme: 'dark' });
      accountRepo.create.mockResolvedValue(dbAccount);
      planRepository.findByType.mockResolvedValue(trialPlan);
      subscriptionsService.create.mockRejectedValue(new Error('DB error'));

      const result = await accountService.register(dto);

      expect(result.name).toBe('Test Account');
      expect(result.id).toBe('acc-1');
      expect(loggerMock.warn).toHaveBeenCalledWith(
        'Failed to auto-assign TRIAL subscription',
        expect.objectContaining({ accountId: 'acc-1' }),
      );
    });

    it('should pass a 7-day period for TRIAL subscription', async () => {
      const dto = new AccountDTO('Test Account', undefined, { theme: 'dark' });
      accountRepo.create.mockResolvedValue(dbAccount);
      planRepository.findByType.mockResolvedValue(trialPlan);
      subscriptionsService.create.mockResolvedValue(mockSubscription);

      await accountService.register(dto);

      const periodEndArg = (subscriptionsService.create as jest.Mock).mock.calls[0][3] as Date;
      const now = new Date();
      const diffMs = periodEndArg.getTime() - now.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      // Allow slight timing differences — should be approximately 7 days
      expect(diffDays).toBeGreaterThanOrEqual(6);
      expect(diffDays).toBeLessThanOrEqual(8);
    });
  });

  describe('getById', () => {
    it('should return account DTO when found', async () => {
      accountRepo.findById.mockResolvedValue(dbAccount);

      const result = await accountService.getById('acc-1');

      expect(result).toBeDefined();
      expect(result!.name).toBe('Test Account');
    });

    it('should return null when not found', async () => {
      accountRepo.findById.mockResolvedValue(null);

      const result = await accountService.getById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getAll', () => {
    it('should return all accounts as DTOs', async () => {
      accountRepo.findAll.mockResolvedValue([dbAccount]);

      const result = await accountService.getAll();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Account');
    });
  });

  describe('update', () => {
    it('should update and return DTO', async () => {
      const dto = new AccountDTO('Updated Name');
      accountRepo.update.mockResolvedValue({ ...dbAccount, name: 'Updated Name' });
      accountMapper.toDTO.mockReturnValue(new AccountDTO('Updated Name', 'acc-1'));

      const result = await accountService.update('acc-1', dto);

      expect(result.name).toBe('Updated Name');
      expect(accountRepo.update).toHaveBeenCalledWith('acc-1', { name: 'Updated Name' });
    });
  });

  describe('delete', () => {
    it('should delete account', async () => {
      accountRepo.delete.mockResolvedValue(undefined);

      await accountService.delete('acc-1');

      expect(accountRepo.delete).toHaveBeenCalledWith('acc-1');
    });
  });
});
