// ---------------------------------------------------------------------------
// Module under test
// ---------------------------------------------------------------------------
import { PLAN_SEED_DATA, seedPlans } from '../../../main/shared/seed/seed-plans';
import type { PrismaClient } from '@prisma/client';

// ---------------------------------------------------------------------------
// Types for mock
// ---------------------------------------------------------------------------

interface IMockPlanClient {
  findUnique: jest.Mock;
  create: jest.Mock;
}

interface IMockPrisma {
  plan: IMockPlanClient;
}

function createMockPrisma(): IMockPrisma {
  return {
    plan: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };
}

// ---------------------------------------------------------------------------

describe('PLAN_SEED_DATA', () => {
  it('should export exactly 3 plans', () => {
    expect(PLAN_SEED_DATA).toHaveLength(3);
  });

  it('should have TRIAL as the first plan', () => {
    expect(PLAN_SEED_DATA[0].type).toBe('TRIAL');
    expect(PLAN_SEED_DATA[0].name).toBe('Trial');
    expect(PLAN_SEED_DATA[0].price).toBe(0);
    expect(PLAN_SEED_DATA[0].features.maxAlarms).toBe(3);
    expect(PLAN_SEED_DATA[0].features.aiAlarms).toBe(false);
    expect(PLAN_SEED_DATA[0].features.allowedConditions).toEqual(['PRICE_DROPS_BELOW', 'PRICE_RISES_ABOVE', 'PRICE_CHANGES_BY_PERCENT']);
    expect(PLAN_SEED_DATA[0].features.notificationChannels).toEqual(['in-app']);
  });

  it('should have STANDARD as the second plan', () => {
    expect(PLAN_SEED_DATA[1].type).toBe('STANDARD');
    expect(PLAN_SEED_DATA[1].name).toBe('Standard');
    expect(PLAN_SEED_DATA[1].price).toBe(9.99);
    expect(PLAN_SEED_DATA[1].features.maxAlarms).toBe(20);
    expect(PLAN_SEED_DATA[1].features.aiAlarms).toBe(false);
    expect(PLAN_SEED_DATA[1].features.allowedConditions).toContain('VIEWS_EXCEED');
    expect(PLAN_SEED_DATA[1].features.notificationChannels).toEqual(['in-app', 'email']);
  });

  it('should have UNLIMITED as the third plan', () => {
    expect(PLAN_SEED_DATA[2].type).toBe('UNLIMITED');
    expect(PLAN_SEED_DATA[2].name).toBe('Unlimited');
    expect(PLAN_SEED_DATA[2].price).toBe(29.99);
    expect(PLAN_SEED_DATA[2].features.maxAlarms).toBe(-1);
    expect(PLAN_SEED_DATA[2].features.aiAlarms).toBe(true);
    expect(PLAN_SEED_DATA[2].features.allowedConditions).toContain('SELLER_CHANGED');
    expect(PLAN_SEED_DATA[2].features.notificationChannels).toEqual(['in-app', 'email', 'telegram', 'whatsapp']);
  });
});

describe('seedPlans', () => {
  let mockPrisma: IMockPrisma;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  const expectedPlans = [
    { name: 'Trial', type: 'TRIAL', price: 0 },
    { name: 'Standard', type: 'STANDARD', price: 9.99 },
    { name: 'Unlimited', type: 'UNLIMITED', price: 29.99 },
  ];

  it('should create all 3 plans when none exist', async () => {
    mockPrisma.plan.findUnique.mockResolvedValue(null);
    mockPrisma.plan.create.mockResolvedValue({});

    await seedPlans(mockPrisma as unknown as PrismaClient);

    expect(mockPrisma.plan.findUnique).toHaveBeenCalledTimes(3);
    expect(mockPrisma.plan.create).toHaveBeenCalledTimes(3);

    expectedPlans.forEach(plan => {
      expect(mockPrisma.plan.findUnique).toHaveBeenCalledWith({
        where: { name: plan.name },
      });
      expect(mockPrisma.plan.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: plan.name }),
        }),
      );
    });
  });

  it('should skip existing plans (idempotent)', async () => {
    // All plans already exist
    mockPrisma.plan.findUnique.mockImplementation(async ({ where: { name } }: { where: { name: string } }) => {
      return expectedPlans.find(p => p.name === name) ?? null;
    });

    await seedPlans(mockPrisma as unknown as PrismaClient);

    expect(mockPrisma.plan.findUnique).toHaveBeenCalledTimes(3);
    expect(mockPrisma.plan.create).not.toHaveBeenCalled();
  });

  it('should create only missing plans (partial seeding)', async () => {
    // Trial exists, others don't
    mockPrisma.plan.findUnique.mockImplementation(async ({ where: { name } }: { where: { name: string } }) => {
      if (name === 'Trial') return { id: 'existing-trial-id' };
      return null;
    });

    await seedPlans(mockPrisma as unknown as PrismaClient);

    expect(mockPrisma.plan.create).toHaveBeenCalledTimes(2);
    expect(mockPrisma.plan.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'Standard' }),
      }),
    );
    expect(mockPrisma.plan.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'Unlimited' }),
      }),
    );
    expect(mockPrisma.plan.create).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'Trial' }),
      }),
    );
  });

  it('should create plan with correct data shape', async () => {
    mockPrisma.plan.findUnique.mockResolvedValue(null);
    mockPrisma.plan.create.mockResolvedValue({});

    await seedPlans(mockPrisma as unknown as PrismaClient);

    // Verify the first plan's data shape
    expect(mockPrisma.plan.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Trial',
          type: 'TRIAL',
          price: 0,
          features: expect.objectContaining({
            maxAlarms: 3,
            aiAlarms: false,
          }),
        }),
      }),
    );

    // Verify Unlimited has aiAlarms: true
    expect(mockPrisma.plan.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Unlimited',
          type: 'UNLIMITED',
          price: 29.99,
          features: expect.objectContaining({
            maxAlarms: -1,
            aiAlarms: true,
          }),
        }),
      }),
    );
  });
});
