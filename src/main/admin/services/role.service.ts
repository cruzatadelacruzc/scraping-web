import { inject, injectable } from 'inversify';
import { PrismaClient } from '@prisma/client';
import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';

@injectable()
export class RoleService {
  public constructor(
    @inject(TYPES.PrismaClient) private readonly _prisma: PrismaClient,
    @inject(TYPES.Logger) private readonly _log: ILogger,
  ) {
    this._log.context = RoleService.name;
  }

  /**
   * Returns all roles with their user count.
   * @returns Array of roles with _count.users.
   */
  public async getAll(): Promise<Array<{ id: string; name: string; accountId: string | null; _count: { users: number } }>> {
    this._log.debug('Fetching all roles');
    return this._prisma.role.findMany({
      include: { _count: { select: { users: true } } },
    });
  }

  /**
   * Creates a new role.
   * @param name - The role name.
   * @param accountId - Optional account ID to scope the role.
   * @returns The created role.
   */
  public async create(name: string, accountId?: string): Promise<{ id: string; name: string; accountId: string | null }> {
    this._log.debug('Creating role', { name, accountId });
    return this._prisma.role.create({
      data: { name, accountId: accountId ?? null },
    });
  }

  /**
   * Deletes a role by ID.
   * @param id - The role ID.
   */
  public async delete(id: string): Promise<void> {
    this._log.debug('Deleting role', { id });
    await this._prisma.role.delete({ where: { id } });
  }

  /**
   * Assigns a role to a user.
   * @param userId - The user ID.
   * @param roleId - The role ID to assign.
   */
  public async assignRole(userId: string, roleId: string): Promise<void> {
    this._log.debug('Assigning role to user', { userId, roleId });
    await this._prisma.user.update({
      where: { id: userId },
      data: { roles: { connect: { id: roleId } } },
    });
  }

  /**
   * Unassigns a role from a user.
   * @param userId - The user ID.
   * @param roleId - The role ID to remove.
   */
  public async unassignRole(userId: string, roleId: string): Promise<void> {
    this._log.debug('Unassigning role from user', { userId, roleId });
    await this._prisma.user.update({
      where: { id: userId },
      data: { roles: { disconnect: { id: roleId } } },
    });
  }
}
