import 'reflect-metadata';
import { PlanEnforcementService } from '@users/services/plan-enforcement.service';
import { SubscriptionsRepository } from '@users/repositories/account-subscriptions.repository';
import { AlarmRepository } from '@alarms/repositories/alarm.repository';
import { PlanLimitReachedError } from '@users/errors/plan-limit-reached.error';

describe('PlanEnforcementService', () => {
  const accountId = 'acc-1';

  let planEnforcement: PlanEnforcementService;
  let subscriptionsRepo: jest.Mocked<SubscriptionsRepository>;
  let alarmRepo: jest.Mocked<AlarmRepository>;
  const loggerMock = { debug: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn(), context: '' } as any;

  const baseDate = new Date('2025-01-01');
  const futureDate = new Date('2025-02-01');

  beforeEach(() => {
    jest.clearAllMocks();

    subscriptionsRepo = {
      findSubscriptionsByPlanId: jest.fn(),
      create: jest.fn(),
      findByAccountId: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<SubscriptionsRepository>;

    alarmRepo = {
      countByAccountId: jest.fn(),
    } as unknown as jest.Mocked<AlarmRepository>;

    planEnforcement = new PlanEnforcementService(loggerMock, subscriptionsRepo, alarmRepo);
  });

  // ---------------------------------------------------------------------------
  // enforceAlarmLimit
  // ---------------------------------------------------------------------------
  describe('enforceAlarmLimit', () => {
    it('throws PlanLimitReachedError when account has no active subscription', async () => {
      subscriptionsRepo.findByAccountId.mockResolvedValue([]);

      await expect(planEnforcement.enforceAlarmLimit(accountId)).rejects.toThrow(PlanLimitReachedError);
    });

    it('throws PlanLimitReachedError when active subscription has no plan', async () => {
      subscriptionsRepo.findByAccountId.mockResolvedValue([
        {
          id: 'sub-1',
          accountId,
          planId: 'plan-1',
          status: 'ACTIVE',
          periodStart: baseDate,
          periodEnd: futureDate,
          createdAt: baseDate,
          updatedAt: baseDate,
          plan: null as any,
        },
      ] as any);

      await expect(planEnforcement.enforceAlarmLimit(accountId)).rejects.toThrow(PlanLimitReachedError);
    });

    it('allows creation when maxAlarms is -1 (unlimited)', async () => {
      subscriptionsRepo.findByAccountId.mockResolvedValue([
        {
          id: 'sub-1',
          accountId,
          planId: 'plan-1',
          status: 'ACTIVE',
          periodStart: baseDate,
          periodEnd: futureDate,
          createdAt: baseDate,
          updatedAt: baseDate,
          plan: {
            id: 'plan-1',
            name: 'Unlimited Plan',
            type: 'UNLIMITED',
            price: 29.99,
            features: { maxAlarms: -1, allowedConditions: [] },
            createdAt: baseDate,
            updatedAt: baseDate,
          },
        },
      ] as any);

      await expect(planEnforcement.enforceAlarmLimit(accountId)).resolves.toBeUndefined();
    });

    it('allows creation when alarm count is below limit', async () => {
      subscriptionsRepo.findByAccountId.mockResolvedValue([
        {
          id: 'sub-1',
          accountId,
          planId: 'plan-1',
          status: 'ACTIVE',
          periodStart: baseDate,
          periodEnd: futureDate,
          createdAt: baseDate,
          updatedAt: baseDate,
          plan: {
            id: 'plan-1',
            name: 'Standard Plan',
            type: 'STANDARD',
            price: 9.99,
            features: { maxAlarms: 10, allowedConditions: ['PRICE_DROPS_BELOW'] },
            createdAt: baseDate,
            updatedAt: baseDate,
          },
        },
      ] as any);
      alarmRepo.countByAccountId.mockResolvedValue(5);

      await expect(planEnforcement.enforceAlarmLimit(accountId)).resolves.toBeUndefined();
      expect(alarmRepo.countByAccountId).toHaveBeenCalledWith(accountId);
    });

    it('throws PlanLimitReachedError when alarm count equals limit', async () => {
      subscriptionsRepo.findByAccountId.mockResolvedValue([
        {
          id: 'sub-1',
          accountId,
          planId: 'plan-1',
          status: 'ACTIVE',
          periodStart: baseDate,
          periodEnd: futureDate,
          createdAt: baseDate,
          updatedAt: baseDate,
          plan: {
            id: 'plan-1',
            name: 'Standard Plan',
            type: 'STANDARD',
            price: 9.99,
            features: { maxAlarms: 10, allowedConditions: ['PRICE_DROPS_BELOW'] },
            createdAt: baseDate,
            updatedAt: baseDate,
          },
        },
      ] as any);
      alarmRepo.countByAccountId.mockResolvedValue(10);

      await expect(planEnforcement.enforceAlarmLimit(accountId)).rejects.toThrow(PlanLimitReachedError);
      expect(alarmRepo.countByAccountId).toHaveBeenCalledWith(accountId);
    });

    it('throws PlanLimitReachedError when alarm count exceeds limit', async () => {
      subscriptionsRepo.findByAccountId.mockResolvedValue([
        {
          id: 'sub-1',
          accountId,
          planId: 'plan-1',
          status: 'ACTIVE',
          periodStart: baseDate,
          periodEnd: futureDate,
          createdAt: baseDate,
          updatedAt: baseDate,
          plan: {
            id: 'plan-1',
            name: 'Standard Plan',
            type: 'STANDARD',
            price: 9.99,
            features: { maxAlarms: 10, allowedConditions: ['PRICE_DROPS_BELOW'] },
            createdAt: baseDate,
            updatedAt: baseDate,
          },
        },
      ] as any);
      alarmRepo.countByAccountId.mockResolvedValue(15);

      await expect(planEnforcement.enforceAlarmLimit(accountId)).rejects.toThrow(PlanLimitReachedError);
    });

    it('considers TRIALING subscription as active', async () => {
      subscriptionsRepo.findByAccountId.mockResolvedValue([
        {
          id: 'sub-1',
          accountId,
          planId: 'plan-1',
          status: 'TRIALING',
          periodStart: baseDate,
          periodEnd: futureDate,
          createdAt: baseDate,
          updatedAt: baseDate,
          plan: {
            id: 'plan-1',
            name: 'Trial Plan',
            type: 'TRIAL',
            price: 0,
            features: { maxAlarms: 3, allowedConditions: ['PRICE_DROPS_BELOW'] },
            createdAt: baseDate,
            updatedAt: baseDate,
          },
        },
      ] as any);
      alarmRepo.countByAccountId.mockResolvedValue(2);

      await expect(planEnforcement.enforceAlarmLimit(accountId)).resolves.toBeUndefined();
    });

    it('ignores PAST_DUE and CANCELED subscriptions', async () => {
      subscriptionsRepo.findByAccountId.mockResolvedValue([
        {
          id: 'sub-1',
          accountId,
          planId: 'plan-1',
          status: 'CANCELED',
          periodStart: baseDate,
          periodEnd: baseDate,
          createdAt: baseDate,
          updatedAt: baseDate,
          plan: {
            id: 'plan-1',
            name: 'Old Plan',
            type: 'STANDARD',
            price: 9.99,
            features: { maxAlarms: 10 },
            createdAt: baseDate,
            updatedAt: baseDate,
          },
        },
        {
          id: 'sub-2',
          accountId,
          planId: 'plan-2',
          status: 'PAST_DUE',
          periodStart: baseDate,
          periodEnd: futureDate,
          createdAt: baseDate,
          updatedAt: baseDate,
          plan: {
            id: 'plan-2',
            name: 'Another Plan',
            type: 'STANDARD',
            price: 9.99,
            features: { maxAlarms: 5 },
            createdAt: baseDate,
            updatedAt: baseDate,
          },
        },
      ] as any);

      await expect(planEnforcement.enforceAlarmLimit(accountId)).rejects.toThrow(PlanLimitReachedError);
    });

    it('handles maxAlarms as a string (JSONB edge case)', async () => {
      subscriptionsRepo.findByAccountId.mockResolvedValue([
        {
          id: 'sub-1',
          accountId,
          planId: 'plan-1',
          status: 'ACTIVE',
          periodStart: baseDate,
          periodEnd: futureDate,
          createdAt: baseDate,
          updatedAt: baseDate,
          plan: {
            id: 'plan-1',
            name: 'Standard Plan',
            type: 'STANDARD',
            price: 9.99,
            features: { maxAlarms: '5', allowedConditions: [] },
            createdAt: baseDate,
            updatedAt: baseDate,
          },
        },
      ] as any);
      alarmRepo.countByAccountId.mockResolvedValue(3);

      await expect(planEnforcement.enforceAlarmLimit(accountId)).resolves.toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // isConditionAllowed
  // ---------------------------------------------------------------------------
  describe('isConditionAllowed', () => {
    it('returns true when plan has no allowedConditions (backward compat)', async () => {
      subscriptionsRepo.findByAccountId.mockResolvedValue([
        {
          id: 'sub-1',
          accountId,
          planId: 'plan-1',
          status: 'ACTIVE',
          periodStart: baseDate,
          periodEnd: futureDate,
          createdAt: baseDate,
          updatedAt: baseDate,
          plan: {
            id: 'plan-1',
            name: 'Old Plan',
            type: 'STANDARD',
            price: 9.99,
            features: { maxAlarms: 10 },
            createdAt: baseDate,
            updatedAt: baseDate,
          },
        },
      ] as any);

      const result = await planEnforcement.isConditionAllowed(accountId, 'PRICE_DROPS_BELOW');
      expect(result).toBe(true);
    });

    it('returns true when allowedConditions is empty array', async () => {
      subscriptionsRepo.findByAccountId.mockResolvedValue([
        {
          id: 'sub-1',
          accountId,
          planId: 'plan-1',
          status: 'ACTIVE',
          periodStart: baseDate,
          periodEnd: futureDate,
          createdAt: baseDate,
          updatedAt: baseDate,
          plan: {
            id: 'plan-1',
            name: 'Restricted Plan',
            type: 'STANDARD',
            price: 9.99,
            features: { maxAlarms: 10, allowedConditions: [] },
            createdAt: baseDate,
            updatedAt: baseDate,
          },
        },
      ] as any);

      const result = await planEnforcement.isConditionAllowed(accountId, 'PRICE_DROPS_BELOW');
      expect(result).toBe(true);
    });

    it('returns true when condition is in allowedConditions', async () => {
      subscriptionsRepo.findByAccountId.mockResolvedValue([
        {
          id: 'sub-1',
          accountId,
          planId: 'plan-1',
          status: 'ACTIVE',
          periodStart: baseDate,
          periodEnd: futureDate,
          createdAt: baseDate,
          updatedAt: baseDate,
          plan: {
            id: 'plan-1',
            name: 'Standard Plan',
            type: 'STANDARD',
            price: 9.99,
            features: { maxAlarms: 10, allowedConditions: ['PRICE_DROPS_BELOW', 'PRICE_RISES_ABOVE'] },
            createdAt: baseDate,
            updatedAt: baseDate,
          },
        },
      ] as any);

      const result = await planEnforcement.isConditionAllowed(accountId, 'PRICE_DROPS_BELOW');
      expect(result).toBe(true);
    });

    it('returns false when condition is NOT in allowedConditions', async () => {
      subscriptionsRepo.findByAccountId.mockResolvedValue([
        {
          id: 'sub-1',
          accountId,
          planId: 'plan-1',
          status: 'ACTIVE',
          periodStart: baseDate,
          periodEnd: futureDate,
          createdAt: baseDate,
          updatedAt: baseDate,
          plan: {
            id: 'plan-1',
            name: 'Basic Plan',
            type: 'STANDARD',
            price: 4.99,
            features: { maxAlarms: 5, allowedConditions: ['PRICE_DROPS_BELOW'] },
            createdAt: baseDate,
            updatedAt: baseDate,
          },
        },
      ] as any);

      const result = await planEnforcement.isConditionAllowed(accountId, 'VIEWS_EXCEED');
      expect(result).toBe(false);
    });
  });
});
