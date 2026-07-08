import { Request, Response } from 'express';
import { AccountAdminController } from '@admin/controllers/account-admin.controller';
import { AccountAdminService } from '@admin/services/account-admin.service';
import { ILogger } from '@shared/logger.interface';

describe('AccountAdminController', () => {
  let controller: AccountAdminController;
  let serviceMock: Record<string, jest.Mock>;
  let loggerMock: ILogger;
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    serviceMock = {
      getAll: jest.fn(),
      getById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    loggerMock = {
      set context(_value: string) {},
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      log: jest.fn(),
    } as unknown as ILogger;

    controller = new AccountAdminController(serviceMock as unknown as AccountAdminService, loggerMock);

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  // =========================================================================
  // list
  // =========================================================================
  describe('list', () => {
    it('should return paginated accounts', async () => {
      req = { query: { skip: '0', limit: '10' } };
      const result = { accounts: [{ id: 'acc-1', name: 'Test' }], total: 1, skip: 0, limit: 10 };
      serviceMock.getAll.mockResolvedValue(result);

      await controller.list(req as Request, res as Response);

      expect(serviceMock.getAll).toHaveBeenCalledWith(0, 10);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: result,
        }),
      );
    });

    it('should use defaults when query params are missing', async () => {
      req = { query: {} };
      serviceMock.getAll.mockResolvedValue({ accounts: [], total: 0, skip: 0, limit: 10 });

      await controller.list(req as Request, res as Response);

      expect(serviceMock.getAll).toHaveBeenCalledWith(0, 10);
    });

    it('should handle errors', async () => {
      req = { query: {} };
      serviceMock.getAll.mockRejectedValue(new Error('DB error'));

      await controller.list(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // =========================================================================
  // getById
  // =========================================================================
  describe('getById', () => {
    it('should return account when found', async () => {
      req = { params: { id: 'acc-1' } };
      const account = { id: 'acc-1', name: 'Test Account', userCount: 2, subscriptionCount: 3, alarmCount: 5 };
      serviceMock.getById.mockResolvedValue(account);

      await controller.getById(req as Request, res as Response);

      expect(serviceMock.getById).toHaveBeenCalledWith('acc-1');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 when account not found', async () => {
      req = { params: { id: 'bad-id' } };
      serviceMock.getById.mockResolvedValue(null);

      await controller.getById(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // =========================================================================
  // update
  // =========================================================================
  describe('update', () => {
    it('should update and return the account', async () => {
      req = { params: { id: 'acc-1' }, body: { name: 'Updated' } };
      const updated = { id: 'acc-1', name: 'Updated', settings: null, createdAt: new Date(), updatedAt: new Date() };
      serviceMock.update.mockResolvedValue(updated);

      await controller.update(req as Request, res as Response);

      expect(serviceMock.update).toHaveBeenCalledWith('acc-1', { name: 'Updated' });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle errors', async () => {
      req = { params: { id: 'acc-1' }, body: {} };
      serviceMock.update.mockRejectedValue(new Error('Update failed'));

      await controller.update(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // =========================================================================
  // delete
  // =========================================================================
  describe('delete', () => {
    it('should delete and return 200', async () => {
      req = { params: { id: 'acc-1' } };
      serviceMock.delete.mockResolvedValue(undefined);

      await controller.delete(req as Request, res as Response);

      expect(serviceMock.delete).toHaveBeenCalledWith('acc-1');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle errors', async () => {
      req = { params: { id: 'bad-id' } };
      serviceMock.delete.mockRejectedValue(new Error('Delete failed'));

      await controller.delete(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
