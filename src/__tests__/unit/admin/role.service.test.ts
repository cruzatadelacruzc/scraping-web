import { RoleService } from '@admin/services/role.service';
import { RoleNotFoundError } from '@admin/errors/role-not-found.error';
import { SystemRoleProtectedError } from '@admin/errors/system-role-protected.error';
import { RoleInactiveError } from '@admin/errors/role-inactive.error';
import { ILogger } from '@shared/logger.interface';

describe('RoleService', () => {
  let service: RoleService;
  let prismaMock: Record<string, Record<string, jest.Mock>>;
  let loggerMock: ILogger;

  beforeEach(() => {
    prismaMock = {
      role: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      user: {
        update: jest.fn(),
      },
    };

    loggerMock = {
      set context(_value: string) {},
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      log: jest.fn(),
    } as unknown as ILogger;

    service = new RoleService(prismaMock as never, loggerMock);
  });

  // =========================================================================
  // getAll
  // =========================================================================
  describe('getAll', () => {
    it('should return all roles with user count', async () => {
      const roles = [
        { id: 'role-1', name: 'SUPER_ADMIN', accountId: null, deletedAt: null, _count: { users: 1 } },
        { id: 'role-2', name: 'ACCOUNT_OWNER', accountId: null, deletedAt: null, _count: { users: 5 } },
      ];
      prismaMock.role.findMany.mockResolvedValue(roles);

      const result = await service.getAll();

      expect(result).toEqual(roles);
      expect(prismaMock.role.findMany).toHaveBeenCalledWith({
        where: {},
        include: { _count: { select: { users: true } } },
      });
    });

    it('should filter only active roles when status=active', async () => {
      prismaMock.role.findMany.mockResolvedValue([]);

      await service.getAll('active');

      expect(prismaMock.role.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        include: { _count: { select: { users: true } } },
      });
    });

    it('should filter only deactivated roles when status=inactive', async () => {
      prismaMock.role.findMany.mockResolvedValue([]);

      await service.getAll('inactive');

      expect(prismaMock.role.findMany).toHaveBeenCalledWith({
        where: { deletedAt: { not: null } },
        include: { _count: { select: { users: true } } },
      });
    });

    it('should return empty array when no roles exist', async () => {
      prismaMock.role.findMany.mockResolvedValue([]);

      const result = await service.getAll();

      expect(result).toEqual([]);
    });

    it('should propagate prisma errors', async () => {
      const error = new Error('DB error');
      prismaMock.role.findMany.mockRejectedValue(error);

      await expect(service.getAll()).rejects.toThrow('DB error');
    });
  });

  // =========================================================================
  // create
  // =========================================================================
  describe('create', () => {
    it('should create a role with only name', async () => {
      const created = { id: 'role-3', name: 'MODERATOR', accountId: null };
      prismaMock.role.create.mockResolvedValue(created);

      const result = await service.create('MODERATOR');

      expect(result).toEqual(created);
      expect(prismaMock.role.create).toHaveBeenCalledWith({
        data: { name: 'MODERATOR', accountId: null },
      });
    });

    it('should create a role with name and accountId', async () => {
      const created = { id: 'role-4', name: 'TENANT_ROLE', accountId: 'acc-1' };
      prismaMock.role.create.mockResolvedValue(created);

      const result = await service.create('TENANT_ROLE', 'acc-1');

      expect(result).toEqual(created);
      expect(prismaMock.role.create).toHaveBeenCalledWith({
        data: { name: 'TENANT_ROLE', accountId: 'acc-1' },
      });
    });

    it('should propagate prisma errors', async () => {
      const error = new Error('Unique constraint');
      prismaMock.role.create.mockRejectedValue(error);

      await expect(service.create('DUPLICATE')).rejects.toThrow('Unique constraint');
    });
  });

  // =========================================================================
  // toggleActive
  // =========================================================================
  describe('toggleActive', () => {
    it('should deactivate an active role', async () => {
      prismaMock.role.findUnique.mockResolvedValue({ id: 'role-1', name: 'MODERATOR', accountId: null, deletedAt: null });
      const updated = { id: 'role-1', name: 'MODERATOR', accountId: null, deletedAt: new Date() };
      prismaMock.role.update.mockResolvedValue(updated);

      const result = await service.toggleActive('role-1');

      expect(result).toEqual(updated);
      expect(prismaMock.role.update).toHaveBeenCalledWith({
        where: { id: 'role-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should reactivate a deactivated role', async () => {
      prismaMock.role.findUnique.mockResolvedValue({
        id: 'role-1',
        name: 'MODERATOR',
        accountId: null,
        deletedAt: new Date('2026-07-01T00:00:00Z'),
      });
      const updated = { id: 'role-1', name: 'MODERATOR', accountId: null, deletedAt: null };
      prismaMock.role.update.mockResolvedValue(updated);

      const result = await service.toggleActive('role-1');

      expect(result).toEqual(updated);
      expect(prismaMock.role.update).toHaveBeenCalledWith({
        where: { id: 'role-1' },
        data: { deletedAt: null },
      });
    });

    it('should throw RoleNotFoundError for unknown id', async () => {
      prismaMock.role.findUnique.mockResolvedValue(null);

      await expect(service.toggleActive('bad-id')).rejects.toThrow(RoleNotFoundError);
      expect(prismaMock.role.update).not.toHaveBeenCalled();
    });

    it('should throw SystemRoleProtectedError for SUPER_ADMIN', async () => {
      prismaMock.role.findUnique.mockResolvedValue({ id: 'role-sa', name: 'SUPER_ADMIN', accountId: null, deletedAt: null });

      await expect(service.toggleActive('role-sa')).rejects.toThrow(SystemRoleProtectedError);
      expect(prismaMock.role.update).not.toHaveBeenCalled();
    });

    it('should propagate prisma errors', async () => {
      prismaMock.role.findUnique.mockRejectedValue(new Error('DB error'));

      await expect(service.toggleActive('role-1')).rejects.toThrow('DB error');
    });
  });

  // =========================================================================
  // assignRole
  // =========================================================================
  describe('assignRole', () => {
    it('should connect an active role to a user', async () => {
      prismaMock.role.findUnique.mockResolvedValue({ id: 'role-1', name: 'MODERATOR', accountId: null, deletedAt: null });
      prismaMock.user.update.mockResolvedValue({ id: 'user-1' });

      await service.assignRole('user-1', 'role-1');

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { roles: { connect: { id: 'role-1' } } },
      });
    });

    it('should throw RoleNotFoundError when the role does not exist', async () => {
      prismaMock.role.findUnique.mockResolvedValue(null);

      await expect(service.assignRole('user-1', 'bad-role')).rejects.toThrow(RoleNotFoundError);
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('should throw RoleInactiveError when the role is deactivated', async () => {
      prismaMock.role.findUnique.mockResolvedValue({ id: 'role-1', name: 'MODERATOR', accountId: null, deletedAt: new Date() });

      await expect(service.assignRole('user-1', 'role-1')).rejects.toThrow(RoleInactiveError);
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('should propagate prisma errors', async () => {
      prismaMock.role.findUnique.mockResolvedValue({ id: 'role-1', name: 'MODERATOR', accountId: null, deletedAt: null });
      prismaMock.user.update.mockRejectedValue(new Error('User not found'));

      await expect(service.assignRole('bad-user', 'role-1')).rejects.toThrow('User not found');
    });
  });

  // =========================================================================
  // unassignRole
  // =========================================================================
  describe('unassignRole', () => {
    it('should disconnect role from user', async () => {
      prismaMock.user.update.mockResolvedValue({ id: 'user-1' });

      await service.unassignRole('user-1', 'role-1');

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { roles: { disconnect: { id: 'role-1' } } },
      });
    });

    it('should propagate prisma errors', async () => {
      const error = new Error('User not found');
      prismaMock.user.update.mockRejectedValue(error);

      await expect(service.unassignRole('bad-user', 'role-1')).rejects.toThrow('User not found');
    });
  });
});
