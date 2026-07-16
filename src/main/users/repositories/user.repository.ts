import { PrismaClient, User, Prisma } from '@prisma/client';
import { inject, injectable } from 'inversify';
import { TYPES } from '@shared/types.container';
import { RoleType } from '@users/dto';

export type UserWithRoles = User & { roles: RoleType[] };

/** Deactivated roles must not appear in auth/JWT flows — always filter. */
const ACTIVE_ROLES_INCLUDE = { roles: { where: { deletedAt: null } } } as const;

@injectable()
export class UserRepository {
  public constructor(@inject(TYPES.PrismaClient) private readonly prisma: PrismaClient) {}

  public findByEmail(email: string): Promise<UserWithRoles | null> {
    return this.prisma.user.findFirst({
      where: { email },
      include: ACTIVE_ROLES_INCLUDE,
    });
  }

  public findByUsername(username: string): Promise<UserWithRoles | null> {
    return this.prisma.user.findFirst({
      where: { username },
      include: ACTIVE_ROLES_INCLUDE,
    });
  }

  public create(data: Prisma.UserCreateInput): Promise<UserWithRoles> {
    return this.prisma.user.create({
      data,
      include: ACTIVE_ROLES_INCLUDE,
    });
  }

  public findById(id: string): Promise<UserWithRoles | null> {
    return this.prisma.user.findFirst({
      where: { id },
      include: ACTIVE_ROLES_INCLUDE,
    });
  }

  public findAll(): Promise<UserWithRoles[]> {
    return this.prisma.user.findMany({
      include: ACTIVE_ROLES_INCLUDE,
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
      include: ACTIVE_ROLES_INCLUDE,
    });
  }

  public async findByIdWithRoles(id: string): Promise<UserWithRoles | null> {
    return this.prisma.user.findFirst({
      where: { id },
      include: ACTIVE_ROLES_INCLUDE,
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
        include: ACTIVE_ROLES_INCLUDE,
      });

      await tx.userIdentity.create({
        data: { userId: user.id, provider, providerId },
      });

      return user;
    });

    return created as UserWithRoles;
  }
}
