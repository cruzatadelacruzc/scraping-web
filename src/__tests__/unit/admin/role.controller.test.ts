import { Request, Response } from 'express';
import { RoleController } from '@admin/controllers/role.controller';
import { RoleService } from '@admin/services/role.service';
import { ILogger } from '@shared/logger.interface';

describe('RoleController', () => {
  let controller: RoleController;
  let serviceMock: Record<string, jest.Mock>;
  let loggerMock: ILogger;
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    serviceMock = {
      getAll: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      assignRole: jest.fn(),
      unassignRole: jest.fn(),
    };

    loggerMock = {
      set context(_value: string) {},
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      log: jest.fn(),
    } as unknown as ILogger;

    controller = new RoleController(serviceMock as unknown as RoleService, loggerMock);

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  // =========================================================================
  // list
  // =========================================================================
  describe('list', () => {
    it('should return all roles', async () => {
      req = {};
      const roles = [{ id: 'role-1', name: 'SUPER_ADMIN', accountId: null, _count: { users: 1 } }];
      serviceMock.getAll.mockResolvedValue(roles);

      await controller.list(req as Request, res as Response);

      expect(serviceMock.getAll).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: { roles },
        }),
      );
    });

    it('should handle errors', async () => {
      req = {};
      serviceMock.getAll.mockRejectedValue(new Error('DB error'));

      await controller.list(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // =========================================================================
  // create
  // =========================================================================
  describe('create', () => {
    it('should create a role from valid body', async () => {
      req = { body: { name: 'MODERATOR' } };
      const created = { id: 'role-3', name: 'MODERATOR', accountId: null };
      serviceMock.create.mockResolvedValue(created);

      await controller.create(req as Request, res as Response);

      expect(serviceMock.create).toHaveBeenCalledWith('MODERATOR', undefined);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should create a role with accountId', async () => {
      req = { body: { name: 'TENANT_ROLE', accountId: 'acc-1' } };
      const created = { id: 'role-4', name: 'TENANT_ROLE', accountId: 'acc-1' };
      serviceMock.create.mockResolvedValue(created);

      await controller.create(req as Request, res as Response);

      expect(serviceMock.create).toHaveBeenCalledWith('TENANT_ROLE', 'acc-1');
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should handle validation errors', async () => {
      req = { body: { name: '' } };

      await controller.create(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should handle service errors', async () => {
      req = { body: { name: 'ADMIN' } };
      serviceMock.create.mockRejectedValue(new Error('Unique constraint'));

      await controller.create(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // =========================================================================
  // delete
  // =========================================================================
  describe('delete', () => {
    it('should delete a role by id', async () => {
      req = { params: { id: 'role-1' } };
      serviceMock.delete.mockResolvedValue(undefined);

      await controller.delete(req as Request, res as Response);

      expect(serviceMock.delete).toHaveBeenCalledWith('role-1');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle errors', async () => {
      req = { params: { id: 'bad-id' } };
      serviceMock.delete.mockRejectedValue(new Error('Not found'));

      await controller.delete(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // =========================================================================
  // assignRole
  // =========================================================================
  describe('assignRole', () => {
    it('should assign a role to a user', async () => {
      req = { params: { userId: 'user-1', roleId: 'role-1' } };
      serviceMock.assignRole.mockResolvedValue(undefined);

      await controller.assignRole(req as Request, res as Response);

      expect(serviceMock.assignRole).toHaveBeenCalledWith('user-1', 'role-1');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle errors', async () => {
      req = { params: { userId: 'bad-user', roleId: 'role-1' } };
      serviceMock.assignRole.mockRejectedValue(new Error('User not found'));

      await controller.assignRole(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // =========================================================================
  // unassignRole
  // =========================================================================
  describe('unassignRole', () => {
    it('should unassign a role from a user', async () => {
      req = { params: { userId: 'user-1', roleId: 'role-1' } };
      serviceMock.unassignRole.mockResolvedValue(undefined);

      await controller.unassignRole(req as Request, res as Response);

      expect(serviceMock.unassignRole).toHaveBeenCalledWith('user-1', 'role-1');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle errors', async () => {
      req = { params: { userId: 'bad-user', roleId: 'role-1' } };
      serviceMock.unassignRole.mockRejectedValue(new Error('User not found'));

      await controller.unassignRole(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
