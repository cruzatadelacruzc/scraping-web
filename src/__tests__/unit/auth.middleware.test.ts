import 'reflect-metadata';
import { AuthMiddleware } from '@shared/middleware/auth.middleware';
import type { Request, Response } from 'express';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@users/custom-prisma-client', () => ({
  __esModule: true,
  default: {
    user: { findFirst: jest.fn() },
  },
  isPrismaUniqueConstraintError: jest.fn(),
}));

jest.mock('@shared/tenant-context-als', () => {
  const mockRunWithRequestContext = jest.fn((_ctx: any, fn: () => any) => fn());
  return {
    getRequestContext: jest.fn(),
    runWithRequestContext: mockRunWithRequestContext,
    TenantContext: jest.fn(),
  };
});

// Refs to mocks (set after jest.mock hoisting)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockPrisma = require('@users/custom-prisma-client').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockGetRequestContext = require('@shared/tenant-context-als').getRequestContext;

// ---------------------------------------------------------------------------

describe('AuthMiddleware', () => {
  let authMiddleware: AuthMiddleware;
  let logger: any;
  let tokenService: any;
  let req: Request;
  let res: Response;
  let next: jest.Mock;

  const dbUser = {
    id: 'test-user-id',
    accountId: 'test-tenant-id',
    email: 'test@example.com',
    username: 'testuser',
    passwordHash: 'hashed',
    displayName: null,
    avatarUrl: null,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    userIdentity: [],
    roles: [{ id: 'role-1', name: 'ACCOUNT_OWNER' }],
  };

  const validToken = 'valid.token.here';
  const validPayload = {
    userId: 'test-user-id',
    tenantId: 'test-tenant-id',
    roles: ['ACCOUNT_OWNER'],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Logger
    logger = {
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      log: jest.fn(),
      context: '',
    };

    // TokenService
    tokenService = {
      verifyToken: jest.fn().mockResolvedValue(validPayload),
      generateToken: jest.fn(),
    };

    // Default ALS mock: store exists, so authMiddleware uses existing store path
    mockGetRequestContext.mockReturnValue({ tenantId: undefined, userId: undefined });

    // Create instance manually
    authMiddleware = new AuthMiddleware(logger, tokenService);

    // Request mock
    req = {
      headers: { authorization: `Bearer ${validToken}` },
      header: jest.fn(),
      user: undefined,
      get: jest.fn(),
      accepts: jest.fn(),
      acceptsCharsets: jest.fn(),
      acceptsEncodings: jest.fn(),
      acceptsLanguages: jest.fn(),
      param: jest.fn(),
      is: jest.fn(),
      cookies: {},
      signedCookies: {},
      secret: undefined,
      app: {},
      originalUrl: '',
      baseUrl: '',
      path: '',
      hostname: '',
      ip: '',
      method: 'GET',
      protocol: 'http',
      query: {},
      params: {},
      body: {},
      secure: false,
      subdomains: [],
      xhr: false,
    } as unknown as Request;

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
      end: jest.fn(),
      type: jest.fn(),
      render: jest.fn(),
      sendStatus: jest.fn(),
      redirect: jest.fn(),
      set: jest.fn(),
      get: jest.fn(),
      locals: {},
      app: {} as any,
      headersSent: false,
    } as unknown as Response;

    next = jest.fn();
  });

  // -----------------------------------------------------------------------
  // handler
  // -----------------------------------------------------------------------

  describe('handler', () => {
    it('should authenticate valid token and call next', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(dbUser);

      await authMiddleware.handler(req as Request, res as Response, next);

      expect(tokenService.verifyToken).toHaveBeenCalledWith(validToken);
      expect(mockPrisma.user.findFirst).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect((req.user as any).roles).toEqual(['ACCOUNT_OWNER']);
      expect(next).toHaveBeenCalled();
    });

    it('should return 401 when no authorization header', async () => {
      req.headers = {};

      await authMiddleware.handler(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when invalid token format', async () => {
      req.headers = { authorization: 'Basic abc' };

      await authMiddleware.handler(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token payload missing tenantId', async () => {
      tokenService.verifyToken.mockResolvedValue({ userId: 'u1' });

      await authMiddleware.handler(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token payload missing userId', async () => {
      tokenService.verifyToken.mockResolvedValue({ tenantId: 't1' });

      await authMiddleware.handler(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 when user not found in DB', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await authMiddleware.handler(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token verification throws', async () => {
      tokenService.verifyToken.mockRejectedValue(new Error('expired'));

      await authMiddleware.handler(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // forRoles is tested via integration tests (requires full container wiring)
  // -----------------------------------------------------------------------
});
