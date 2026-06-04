import { PrismaClient, Prisma } from '@prisma/client';
import { TYPES } from '@shared/types.container';
import { inject, injectable } from 'inversify';

@injectable()
export class SubscriptionsRepository {
  public constructor(@inject(TYPES.PrismaClient) private readonly prisma: PrismaClient) {}

  public findSubscriptionsByPlanId(planId: string): Promise<
    Prisma.AccountSubscriptionGetPayload<{
      include: { account: { omit: { settings: true } } };
    }>[]
  > {
    return this.prisma.accountSubscription.findMany({
      where: { planId },
      include: {
        account: { omit: { settings: true } },
      },
    });
  }

  public create(data: Prisma.AccountSubscriptionCreateInput): Promise<Prisma.AccountSubscriptionGetPayload<{ include: { plan: true } }>> {
    return this.prisma.accountSubscription.create({
      data,
      include: { plan: true },
    });
  }

  public findByAccountId(accountId: string): Promise<Prisma.AccountSubscriptionGetPayload<{ include: { plan: true } }>[]> {
    return this.prisma.accountSubscription.findMany({
      where: { accountId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  public update(
    id: string,
    data: Prisma.AccountSubscriptionUpdateInput,
  ): Promise<Prisma.AccountSubscriptionGetPayload<{ include: { plan: true } }>> {
    return this.prisma.accountSubscription.update({
      where: { id },
      data,
      include: { plan: true },
    });
  }
}
