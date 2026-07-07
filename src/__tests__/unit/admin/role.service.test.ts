import { RoleService } from '@admin/services/role.service';
import { ILogger } from '@shared/logger.interface';

describe('RoleService', () => {
  let service: RoleService;
  let prismaMock: Record<string, Record<string, jest.Mock>>;
  let loggerMock: ILogger;

  beforeEach(() => {
    prismaMock = {
      role: {
        findMany: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
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
        { id: 'role-1', name: 'SUPER_ADMIN', accountId: null, _count: { users: 1 } },
        { id: 'role-2', name: 'ACCOUNT_OWNER', accountId: null, _count: { users: 5 } },
      ];
      prismaMock.role.findMany.mockResolvedValue(roles);

      const result = await service.getAll();

      expect(result).toEqual(roles);
      expect(prismaMock.role.findMany).toHaveBeenCalledWith({
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
  // delete
  // =========================================================================
  describe('delete', () => {
    it('should delete a role by id', async () => {
      prismaMock.role.delete.mockResolvedValue({ id: 'role-1', name: 'TEST', accountId: null });

      await service.delete('role-1');

      expect(prismaMock.role.delete).toHaveBeenCalledWith({ where: { id: 'role-1' } });
    });

    it('should propagate prisma errors', async () => {
      const error = new Error('Record not found');
      prismaMock.role.delete.mockRejectedValue(error);

      await expect(service.delete('bad-id')).rejects.toThrow('Record not found');
    });
  });

  // =========================================================================
  // assignRole
  // =========================================================================
  describe('assignRole', () => {
    it('should connect role to user', async () => {
      prismaMock.user.update.mockResolvedValue({ id: 'user-1' });

      await service.assignRole('user-1', 'role-1');

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { roles: { connect: { id: 'role-1' } } },
      });
    });

    it('should propagate prisma errors', async () => {
      const error = new Error('User not found');
      prismaMock.user.update.mockRejectedValue(error);

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
