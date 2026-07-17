import { Request, Response } from 'express';
import { RoleController } from '@admin/controllers/role.controller';
import { RoleService } from '@admin/services/role.service';
import { ILogger } from '@shared/logger.interface';
import { RoleInactiveError } from '@admin/errors/role-inactive.error';
import { RoleNotFoundError } from '@admin/errors/role-not-found.error';
import { SystemRoleProtectedError } from '@admin/errors/system-role-protected.error';

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
      toggleActive: jest.fn(),
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
      const roles = [{ id: 'role-1', name: 'SUPER_ADMIN', accountId: null, deletedAt: null, _count: { users: 1 } }];
      serviceMock.getAll.mockResolvedValue(roles);

      await controller.list(req as Request, res as Response);

      expect(serviceMock.getAll).toHaveBeenCalledWith(undefined);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: { roles },
        }),
      );
    });

    it('should pass the status filter to the service', async () => {
      req = { query: { status: 'inactive' } } as unknown as Partial<Request>;
      serviceMock.getAll.mockResolvedValue([]);

      await controller.list(req as Request, res as Response);

      expect(serviceMock.getAll).toHaveBeenCalledWith('inactive');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 for an invalid status filter', async () => {
      req = { query: { status: 'nope' } } as unknown as Partial<Request>;

      await controller.list(req as Request, res as Response);

      expect(serviceMock.getAll).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
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
  // toggleActive
  // =========================================================================
  describe('toggleActive', () => {
    it('should toggle a role and return it', async () => {
      req = { params: { id: 'role-1' } } as unknown as Partial<Request>;
      const role = { id: 'role-1', name: 'MODERATOR', accountId: null, deletedAt: new Date() };
      serviceMock.toggleActive.mockResolvedValue(role);

      await controller.toggleActive(req as Request, res as Response);

      expect(serviceMock.toggleActive).toHaveBeenCalledWith('role-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: { role },
        }),
      );
    });

    it('should return 404 when the role does not exist', async () => {
      req = { params: { id: 'bad-id' } } as unknown as Partial<Request>;
      serviceMock.toggleActive.mockRejectedValue(new RoleNotFoundError());

      await controller.toggleActive(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 409 for a protected system role', async () => {
      req = { params: { id: 'role-sa' } } as unknown as Partial<Request>;
      serviceMock.toggleActive.mockRejectedValue(new SystemRoleProtectedError());

      await controller.toggleActive(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('should return 500 for unexpected errors', async () => {
      req = { params: { id: 'role-1' } } as unknown as Partial<Request>;
      serviceMock.toggleActive.mockRejectedValue(new Error('boom'));

      await controller.toggleActive(req as Request, res as Response);

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

    it('should return 404 when the role does not exist', async () => {
      req = { params: { userId: 'user-1', roleId: 'bad-role' } } as unknown as Partial<Request>;
      serviceMock.assignRole.mockRejectedValue(new RoleNotFoundError());

      await controller.assignRole(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 409 when the role is deactivated', async () => {
      req = { params: { userId: 'user-1', roleId: 'role-1' } } as unknown as Partial<Request>;
      serviceMock.assignRole.mockRejectedValue(new RoleInactiveError());

      await controller.assignRole(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(409);
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
