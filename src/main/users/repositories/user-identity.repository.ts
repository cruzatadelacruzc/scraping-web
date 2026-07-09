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

  /**
   * Deletes a UserIdentity by its ID.
   *
   * @param id - The identity record ID to delete.
   */
  public async delete(id: string): Promise<void> {
    await this._prisma.userIdentity.delete({ where: { id } });
  }
}
