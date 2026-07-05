import { Request, Response } from 'express';

const userServiceMock = {
  getAll: jest.fn(),
  delete: jest.fn(),
};

jest.mock('@users/services/user.service', () => ({
  UserService: jest.fn().mockImplementation(() => userServiceMock),
}));

import { AdminController } from '@admin/controllers/admin.controller';
import { ResponseHandler } from '@shared/response-handler';
import { ILogger } from '@shared/logger.interface';
import { UserService } from '@users/services/user.service';

describe('AdminController', () => {
  let controller: AdminController;
  let loggerMock: ILogger;
  let mockRes: Response;

  beforeEach(() => {
    jest.clearAllMocks();

    loggerMock = {
      context: '',
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      log: jest.fn(),
    } as unknown as ILogger;

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;

    const userServiceInstance = new (UserService as jest.Mock)() as UserService;

    controller = new AdminController(userServiceInstance, loggerMock) as unknown as AdminController;

    jest.spyOn(ResponseHandler, 'ok');
    jest.spyOn(ResponseHandler, 'deleted');
    jest.spyOn(ResponseHandler, 'notFound');
  });

  describe('structural', () => {
    it('should be decorated with @injectable()', () => {
      const hasParamTypes = Reflect.hasOwnMetadata('inversify:paramtypes', AdminController);
      expect(hasParamTypes).toBe(true);
    });
  });

  describe('list', () => {
    it('should return users via ResponseHandler.ok', async () => {
      const users = [{ id: '1', email: 'a@b.c' }];
      userServiceMock.getAll.mockResolvedValue(users);

      const req = {} as Request;

      await controller.list(req, mockRes);

      expect(ResponseHandler.ok).toHaveBeenCalledWith(mockRes, { users });
    });
  });

  describe('delete', () => {
    it('should call ResponseHandler.deleted on success', async () => {
      userServiceMock.delete.mockResolvedValue(undefined);

      const req = { params: { id: 'valid-id' } } as unknown as Request;

      await controller.delete(req, mockRes);

      expect(userServiceMock.delete).toHaveBeenCalledWith('valid-id');
      expect(ResponseHandler.deleted).toHaveBeenCalledWith(mockRes);
    });

    it('should call ResponseHandler.notFound when UserService.delete throws', async () => {
      userServiceMock.delete.mockRejectedValue(new Error('not found'));

      const req = { params: { id: 'bad-id' } } as unknown as Request;

      await controller.delete(req, mockRes);

      expect(ResponseHandler.notFound).toHaveBeenCalledWith(mockRes);
    });
  });
});
