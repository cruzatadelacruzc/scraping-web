import { inject, injectable } from 'inversify';
import { PrismaClient } from '@prisma/client';
import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';
import { RoleNotFoundError } from '@admin/errors/role-not-found.error';
import { SystemRoleProtectedError } from '@admin/errors/system-role-protected.error';
import { RoleInactiveError } from '@admin/errors/role-inactive.error';

@injectable()
export class RoleService {
  public constructor(
    @inject(TYPES.PrismaClient) private readonly _prisma: PrismaClient,
    @inject(TYPES.Logger) private readonly _log: ILogger,
  ) {
    this._log.context = RoleService.name;
  }

  /**
   * Returns roles with their user count, optionally filtered by activation state.
   * @param status - Optional filter: 'active' (deletedAt = null) or 'inactive' (deletedAt set).
   * @returns Array of roles with _count.users and deletedAt.
   */
  public async getAll(
    status?: 'active' | 'inactive',
  ): Promise<Array<{ id: string; name: string; accountId: string | null; deletedAt: Date | null; _count: { users: number } }>> {
    this._log.debug('Fetching roles', { status: status ?? 'all' });
    const where = status === 'active' ? { deletedAt: null } : status === 'inactive' ? { deletedAt: { not: null } } : {};
    return this._prisma.role.findMany({
      where,
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
   * Toggles a role between active and deactivated (soft-delete via deletedAt).
   * @param id - The role ID.
   * @returns The updated role.
   * @throws RoleNotFoundError if the role does not exist.
   * @throws SystemRoleProtectedError if the role is SUPER_ADMIN.
   */
  public async toggleActive(id: string): Promise<{ id: string; name: string; accountId: string | null; deletedAt: Date | null }> {
    const role = await this._prisma.role.findUnique({ where: { id } });
    if (!role) {
      this._log.warn('Role not found for toggle', { roleId: id });
      throw new RoleNotFoundError();
    }
    if (role.name === 'SUPER_ADMIN') {
      this._log.warn('Attempted to toggle protected system role', { roleId: id });
      throw new SystemRoleProtectedError();
    }
    const deletedAt = role.deletedAt ? null : new Date();
    this._log.debug('Toggling role active state', { roleId: id, deactivating: deletedAt !== null });
    return this._prisma.role.update({ where: { id }, data: { deletedAt } });
  }

  /**
   * Assigns a role to a user. Deactivated roles cannot be assigned.
   * @param userId - The user ID.
   * @param roleId - The role ID to assign.
   * @throws RoleNotFoundError if the role does not exist.
   * @throws RoleInactiveError if the role is deactivated.
   */
  public async assignRole(userId: string, roleId: string): Promise<void> {
    const role = await this._prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      this._log.warn('Role not found for assignment', { userId, roleId });
      throw new RoleNotFoundError();
    }
    if (role.deletedAt) {
      this._log.warn('Attempted to assign a deactivated role', { userId, roleId });
      throw new RoleInactiveError();
    }
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
