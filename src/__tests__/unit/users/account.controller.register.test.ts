import 'reflect-metadata';
import { Request, Response } from 'express';

const userServiceMock = {
  registerLocal: jest.fn(),
  registerWithProvider: jest.fn(),
};

jest.mock('@users/services/user.service', () => ({
  UserService: jest.fn().mockImplementation(() => userServiceMock),
}));

jest.mock('@users/services/account.service', () => ({
  AccountService: jest.fn().mockImplementation(() => ({})),
}));

import { AccountController } from '@users/controllers/account.controller';
import { ResponseHandler } from '@shared/response-handler';
import { ILogger } from '@shared/logger.interface';
import { UserService } from '@users/services/user.service';
import { AccountService } from '@users/services/account.service';

describe('AccountController register endpoints', () => {
  let controller: AccountController;
  let mockRes: Response;

  const loggerMock = {
    context: '',
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  } as unknown as ILogger;

  const authResponse = {
    user: { id: 'user-1', email: 'john@example.com' },
    token: 'jwt-token',
    refreshToken: 'refresh-token',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;

    const userServiceInstance = new (UserService as jest.Mock)() as UserService;
    const accountServiceInstance = new (AccountService as jest.Mock)() as AccountService;
    controller = new AccountController(loggerMock, userServiceInstance, accountServiceInstance);

    jest.spyOn(ResponseHandler, 'created');
  });

  it('registerLocal responds with user, token, and refreshToken', async () => {
    userServiceMock.registerLocal.mockResolvedValue(authResponse);
    const req = {
      body: {
        accountId: '123e4567-e89b-42d3-a456-426614174000',
        email: 'john@example.com',
        username: 'john_doe',
        password: 'Password123',
      },
    } as Request;

    await controller.registerLocal(req, mockRes);

    expect(ResponseHandler.created).toHaveBeenCalledWith(mockRes, 'http:created', {
      user: authResponse.user,
      token: authResponse.token,
      refreshToken: authResponse.refreshToken,
    });
  });

  it('registerWithProvider responds with user, token, and refreshToken', async () => {
    userServiceMock.registerWithProvider.mockResolvedValue(authResponse);
    const req = {
      body: {
        accountId: '123e4567-e89b-42d3-a456-426614174000',
        email: 'alice@example.com',
        username: 'alice',
        provider: 'google',
        providerId: 'prov-1',
      },
    } as Request;

    await controller.registerWithProvider(req, mockRes);

    expect(ResponseHandler.created).toHaveBeenCalledWith(mockRes, 'http:created', {
      user: authResponse.user,
      token: authResponse.token,
      refreshToken: authResponse.refreshToken,
    });
  });
});
