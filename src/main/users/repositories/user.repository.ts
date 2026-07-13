import { PrismaClient, User, Prisma } from '@prisma/client';
import { inject, injectable } from 'inversify';
import { TYPES } from '@shared/types.container';
import { RoleType } from '@users/dto';

export type UserWithRoles = User & { roles: RoleType[] };

@injectable()
export class UserRepository {
  public constructor(@inject(TYPES.PrismaClient) private readonly prisma: PrismaClient) {}

  public findByEmail(email: string): Promise<UserWithRoles | null> {
    return this.prisma.user.findFirst({
      where: { email },
      include: { roles: true },
    });
  }

  public findByUsername(username: string): Promise<UserWithRoles | null> {
    return this.prisma.user.findFirst({
      where: { username },
      include: { roles: true },
    });
  }

  public create(data: Prisma.UserCreateInput): Promise<UserWithRoles> {
    return this.prisma.user.create({
      data,
      include: { roles: true },
    });
  }

  public findById(id: string): Promise<UserWithRoles | null> {
    return this.prisma.user.findFirst({
      where: { id },
      include: { roles: true },
    });
  }

  public findAll(): Promise<UserWithRoles[]> {
    return this.prisma.user.findMany({
      include: { roles: true },
    });
  }

  public async delete(id: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id },
    });
  }

  public update(id: string, data: Partial<User>): Promise<UserWithRoles> {
    return this.prisma.user.update({
      where: { id },
      data,
      include: { roles: true },
    });
  }

  public async findByIdWithRoles(id: string): Promise<UserWithRoles | null> {
    return this.prisma.user.findFirst({
      where: { id },
      include: { roles: true },
    });
  }

  /**
   * Create user + identity in a single transaction.
   * This method uses a transaction to create both the user and the identity atomically.
   */
  public async createWithIdentity(userCreateInput: Prisma.UserCreateInput, provider: string, providerId: string): Promise<UserWithRoles> {
    const created = await this.prisma.$transaction(async tx => {
      const user = await tx.user.create({
        data: userCreateInput,
        include: { roles: true },
      });

      await tx.userIdentity.create({
        data: { userId: user.id, provider, providerId },
      });

      return user;
    });

    return created as UserWithRoles;
  }
}
