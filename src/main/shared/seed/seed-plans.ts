import { PlanType, type PrismaClient } from '@prisma/client';

// ---------------------------------------------------------------------------
// Plan seed data — exact values from the product specification
// ---------------------------------------------------------------------------

export interface IPlanSeedInput {
  name: string;
  type: PlanType;
  price: number;
  features: {
    maxAlarms: number;
    allowedConditions: string[];
    aiAlarms: boolean;
    notificationChannels: string[];
  };
}

export const PLAN_SEED_DATA: IPlanSeedInput[] = [
  {
    name: 'Trial',
    type: 'TRIAL',
    price: 0,
    features: {
      maxAlarms: 3,
      allowedConditions: ['PRICE_DROPS_BELOW', 'PRICE_RISES_ABOVE', 'PRICE_CHANGES_BY_PERCENT'],
      aiAlarms: false,
      notificationChannels: ['in-app'],
    },
  },
  {
    name: 'Standard',
    type: 'STANDARD',
    price: 9.99,
    features: {
      maxAlarms: 20,
      allowedConditions: [
        'PRICE_DROPS_BELOW',
        'PRICE_RISES_ABOVE',
        'PRICE_CHANGES_BY_PERCENT',
        'VIEWS_EXCEED',
        'IS_OUTSTANDING',
        'SELLER_CHANGED',
      ],
      aiAlarms: false,
      notificationChannels: ['in-app', 'email'],
    },
  },
  {
    name: 'Unlimited',
    type: 'UNLIMITED',
    price: 29.99,
    features: {
      maxAlarms: -1,
      allowedConditions: [
        'PRICE_DROPS_BELOW',
        'PRICE_RISES_ABOVE',
        'PRICE_CHANGES_BY_PERCENT',
        'VIEWS_EXCEED',
        'IS_OUTSTANDING',
        'SELLER_CHANGED',
      ],
      aiAlarms: true,
      notificationChannels: ['in-app', 'email', 'telegram', 'whatsapp'],
    },
  },
];

// ---------------------------------------------------------------------------
// seedPlans — idempotent plan seeding
// ---------------------------------------------------------------------------

export async function seedPlans(prisma: PrismaClient): Promise<void> {
  for (const plan of PLAN_SEED_DATA) {
    const existing = await prisma.plan.findUnique({
      where: { name: plan.name },
    });

    if (existing) {
      console.log(`  Plan "${plan.name}" already exists`);
      continue;
    }

    await prisma.plan.create({
      data: {
        name: plan.name,
        type: plan.type,
        price: plan.price,
        features: plan.features,
      },
    });

    console.log(`  Plan "${plan.name}" created`);
  }
}
