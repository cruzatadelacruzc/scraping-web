import { inject, injectable } from 'inversify';
import { PrismaClient, UserIdentity } from '@prisma/client';
import { TYPES } from '@shared/types.container';

@injectable()
export class UserIdentityRepository {
  public constructor(@inject(TYPES.PrismaClient) private readonly _prisma: PrismaClient) {}

  public async create(userId: string, provider: string, providerId: string): Promise<UserIdentity> {
    return this._prisma.userIdentity.create({
      data: {
        userId,
        provider,
        providerId,
      },
    });
  }

  public async findByProvider(provider: string, providerId: string): Promise<UserIdentity | null> {
    return this._prisma.userIdentity.findFirst({
      where: {
        provider,
        providerId,
      },
    });
  }
}
