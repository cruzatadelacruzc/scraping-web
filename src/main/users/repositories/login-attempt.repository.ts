import { inject, injectable } from 'inversify';
import { PrismaClient } from '@prisma/client';
import { TYPES } from '@shared/types.container';

export interface ICreateLoginAttemptData {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
}

@injectable()
export class LoginAttemptRepository {
  public constructor(@inject(TYPES.PrismaClient) private readonly _prisma: PrismaClient) {}

  public async create(data: ICreateLoginAttemptData): Promise<void> {
    await this._prisma.loginAttempt.create({ data });
  }

  public async countRecentFailedAttempts(ipAddress: string, windowMinutes: number = 15): Promise<number> {
    const since = new Date(Date.now() - windowMinutes * 60 * 1000);
    return this._prisma.loginAttempt.count({
      where: {
        ipAddress,
        success: false,
        createdAt: { gte: since },
      },
    });
  }

  public async countRecentFailedAttemptsByUser(userId: string, windowMinutes: number = 15): Promise<number> {
    const since = new Date(Date.now() - windowMinutes * 60 * 1000);
    return this._prisma.loginAttempt.count({
      where: {
        userId,
        success: false,
        createdAt: { gte: since },
      },
    });
  }
}
