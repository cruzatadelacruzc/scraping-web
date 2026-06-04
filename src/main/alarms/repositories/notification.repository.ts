import { PrismaClient, Prisma } from '@prisma/client';
import { TYPES } from '@shared/types.container';
import { inject, injectable } from 'inversify';

@injectable()
export class NotificationRepository {
  public constructor(@inject(TYPES.PrismaClient) private readonly prisma: PrismaClient) {}

  public async create(data: Prisma.NotificationCreateInput): Promise<void> {
    await this.prisma.notification.create({ data });
  }

  public async findByAccountId(
    accountId: string,
  ): Promise<Prisma.NotificationGetPayload<{ include: { alarm: { select: { name: true; productUrl: true } } } }>[]> {
    return this.prisma.notification.findMany({
      where: { accountId },
      include: { alarm: { select: { name: true, productUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async markAsRead(id: string): Promise<void> {
    await this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }
}
