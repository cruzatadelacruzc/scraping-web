import { PrismaClient, Prisma } from '@prisma/client';
import { TYPES } from '@shared/types.container';
import { inject, injectable } from 'inversify';

@injectable()
export class AlarmRepository {
  public constructor(@inject(TYPES.PrismaClient) private readonly prisma: PrismaClient) {}

  public async create(data: Prisma.AlarmCreateInput): Promise<Prisma.AlarmGetPayload<{ include: { history: true; notifications: true } }>> {
    return this.prisma.alarm.create({
      data,
      include: { history: true, notifications: true },
    });
  }

  public async findById(id: string): Promise<Prisma.AlarmGetPayload<{ include: { history: true; notifications: true } }> | null> {
    return this.prisma.alarm.findUnique({
      where: { id },
      include: { history: true, notifications: true },
    });
  }

  public async findAll(): Promise<Prisma.AlarmGetPayload<{ include: { history: true; notifications: true } }>[]> {
    return this.prisma.alarm.findMany({
      include: { history: true, notifications: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async findByProductUrls(urls: string[]): Promise<Prisma.AlarmGetPayload<{ include: { history: true } }>[]> {
    return this.prisma.alarm.findMany({
      where: { productUrl: { in: urls }, enabled: true },
      include: { history: true },
    });
  }

  public async update(
    id: string,
    data: Prisma.AlarmUpdateInput,
  ): Promise<Prisma.AlarmGetPayload<{ include: { history: true; notifications: true } }>> {
    return this.prisma.alarm.update({
      where: { id },
      data,
      include: { history: true, notifications: true },
    });
  }

  public async delete(id: string): Promise<void> {
    await this.prisma.alarm.delete({ where: { id } });
  }

  public async setEnabledForAccount(accountId: string, enabled: boolean): Promise<{ count: number }> {
    return this.prisma.alarm.updateMany({
      where: { accountId },
      data: { enabled },
    });
  }

  public async countByAccountId(accountId: string): Promise<number> {
    return this.prisma.alarm.count({
      where: { accountId },
    });
  }

  public async createHistory(data: Prisma.AlarmHistoryCreateInput): Promise<void> {
    await this.prisma.alarmHistory.create({ data });
  }

  public async findHistoryByAlarmAndPrice(alarmId: string, price: number): Promise<boolean> {
    const found = await this.prisma.alarmHistory.findFirst({
      where: { alarmId, price },
    });
    return found !== null;
  }
}
