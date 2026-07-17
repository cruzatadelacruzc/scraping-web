import 'reflect-metadata';
import jwt from 'jsonwebtoken';
import { LinkCodeService } from '@bots/services/link-code.service';
import { LinkCodeRepository } from '@bots/repositories/link-code.repository';
import { LinkAuditRepository } from '@bots/repositories/link-audit.repository';
import { BotConversationRepository } from '@bots/repositories/bot-conversation.repository';
import { BotMenuService } from '@bots/services/bot-menu.service';
import { InvalidLinkCodeError } from '@bots/errors/invalid-link-code.error';

// Redis mock to avoid real connections
jest.mock('ioredis', () => {
  const mocks = {
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    connect: jest.fn().mockResolvedValue(undefined),
    pipeline: jest.fn().mockReturnValue({
      incr: jest.fn().mockReturnThis(),
      ttl: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      setex: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        [null, 1],
        [null, -1],
      ]),
    }),
    on: jest.fn(),
  };
  return { default: jest.fn(() => mocks), __esModule: true };
});

// JWT mock (jest.mock calls are hoisted — runs before the import)
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('fake-jwt-token'),
  verify: jest.fn(),
}));

const mockJwt = jwt as any;

// Rate limit mock always allows
const createRateLimitAllowed = (): {
  checkValidationAttempt: jest.Mock;
  checkCodeGeneration: jest.Mock;
  recordSuccessfulValidation: jest.Mock;
} => ({
  checkValidationAttempt: jest.fn().mockResolvedValue({ allowed: true, retryAfterMs: 0, remaining: 5 }),
  checkCodeGeneration: jest.fn().mockResolvedValue({ allowed: true, retryAfterMs: 0, remaining: 3 }),
  recordSuccessfulValidation: jest.fn().mockResolvedValue(undefined),
});

describe('LinkCodeService', () => {
  let service: LinkCodeService;
  let repo: jest.Mocked<LinkCodeRepository>;
  let auditRepo: jest.Mocked<LinkAuditRepository>;
  let convRepo: jest.Mocked<BotConversationRepository>;
  let rateLimit: ReturnType<typeof createRateLimitAllowed>;
  let menu: jest.Mocked<BotMenuService>;
  const log = { debug: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn(), context: '' } as any;

  const mockCodeRecord = {
    id: 'code-id-1',
    code: 'test-jti-123456',
    userId: 'user-1',
    accountId: 'tenant-1',
    status: 'PENDING' as const,
    expiresAt: new Date(Date.now() + 600_000),
    validatedAt: null,
    confirmedAt: null,
    rejectedAt: null,
    consumedAt: null,
    validatedFrom: null,
    provider: null,
    attemptCount: 0,
    createdAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    process.env.BOT_LINK_CODE_TTL_MINUTES = '5';
    process.env.REDIS_URL = 'redis://localhost:6379';

    mockJwt.sign.mockReturnValue('fake-jwt-token');
    mockJwt.verify.mockReturnValue({
      sub: 'user-1',
      accountId: 'tenant-1',
      purpose: 'bot-link',
      provider: 'telegram',
      jti: 'test-jti-123456',
    });

    repo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn(),
      consume: jest.fn(),
      findExpired: jest.fn(),
      markValidated: jest.fn(),
      markConfirmed: jest.fn(),
      markConsumed: jest.fn(),
      markRejected: jest.fn(),
      markExpired: jest.fn(),
      incrementAttempts: jest.fn(),
      findExpiredPending: jest.fn(),
      findPendingForUser: jest.fn(),
    } as any;

    auditRepo = {
      log: jest.fn().mockResolvedValue({}),
      findByAccountId: jest.fn().mockResolvedValue({ entries: [], total: 0 }),
    } as any;

    convRepo = {
      upsert: jest.fn(),
      findByExternalId: jest.fn(),
      findByUserId: jest.fn(),
      findExpiredLinks: jest.fn(),
      linkUser: jest.fn(),
      unlinkUser: jest.fn(),
      updateLinkExpiry: jest.fn(),
      updateLastActivity: jest.fn(),
      updatePreferredLang: jest.fn(),
    } as any;

    rateLimit = createRateLimitAllowed();

    menu = {
      applyCommands: jest.fn(),
      buildKeyboard: jest.fn(),
      getButtons: jest.fn(),
      sendWithKeyboard: jest.fn(),
    } as any;

    service = new LinkCodeService(log, repo, auditRepo, rateLimit as any, convRepo, menu);
  });

  describe('generate', () => {
    it('generates a JWT token and deep link for the given provider', async () => {
      repo.create.mockResolvedValueOnce(mockCodeRecord);

      const result = await service.generate('user-1', 'tenant-1', 'telegram');

      expect(mockJwt.sign).toHaveBeenCalled();
      expect(result.token).toBe('fake-jwt-token');
      expect(result.deepLink).toContain('t.me');
      expect(result.expiresAt).toBeDefined();
      expect(repo.create).toHaveBeenCalled();
      expect(auditRepo.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'CODE_GENERATED' }));
    });

    it('includes provider in the deep link', async () => {
      repo.create.mockResolvedValueOnce(mockCodeRecord);

      const telegramResult = await service.generate('user-1', 'tenant-1', 'telegram');
      expect(telegramResult.deepLink).toContain('t.me');

      const waResult = await service.generate('user-1', 'tenant-1', 'whatsapp');
      expect(waResult).toBeDefined();
    });
  });

  describe('verifyAndLink', () => {
    it('verifies a valid JWT token and links the conversation', async () => {
      repo.findByCode.mockResolvedValueOnce(mockCodeRecord);
      repo.markConsumed.mockResolvedValueOnce({ ...mockCodeRecord, consumedAt: new Date(), status: 'CONSUMED' } as any);
      convRepo.findByExternalId.mockResolvedValueOnce({
        id: 'conv-1',
        externalId: '123456',
        provider: 'telegram',
        userId: null,
        accountId: null,
        preferredLang: 'es',
        lastMessage: null,
        lastActivity: new Date(),
        linkExpiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      convRepo.linkUser.mockResolvedValueOnce({} as any);

      const result = await service.verifyAndLink('fake-jwt-token', '123456', 'telegram');

      expect(result).toBe(true);
      expect(convRepo.linkUser).toHaveBeenCalled();
      expect(menu.applyCommands).toHaveBeenCalledWith('123456', true);
      expect(auditRepo.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'LINKED' }));
    });

    it('throws InvalidLinkCodeError for an invalid JWT', async () => {
      mockJwt.verify.mockImplementationOnce(() => {
        throw new Error('invalid signature');
      });

      await expect(service.verifyAndLink('bad-token', '123456', 'telegram')).rejects.toThrow(InvalidLinkCodeError);
    });

    it('throws InvalidLinkCodeError when purpose is wrong', async () => {
      mockJwt.verify.mockReturnValueOnce({
        sub: 'user-1',
        accountId: 'tenant-1',
        purpose: 'wrong-purpose',
        provider: 'telegram',
        jti: 'jti-1',
      });

      await expect(service.verifyAndLink('token', '123456', 'telegram')).rejects.toThrow(InvalidLinkCodeError);
    });
  });

  describe('check (legacy)', () => {
    it('returns the code record when valid (not consumed, not expired)', async () => {
      repo.findByCode.mockResolvedValueOnce(mockCodeRecord);

      const result = await service.check('test-jti-123456');

      expect(result).toEqual(mockCodeRecord);
    });

    it('returns null when code not found', async () => {
      repo.findByCode.mockResolvedValueOnce(null);
      const result = await service.check('MISSING');
      expect(result).toBeNull();
    });

    it('returns null when code is expired', async () => {
      repo.findByCode.mockResolvedValueOnce({ ...mockCodeRecord, expiresAt: new Date(Date.now() - 60_000) });
      const result = await service.check('EXPIRED');
      expect(result).toBeNull();
    });

    it('returns null when already consumed', async () => {
      repo.findByCode.mockResolvedValueOnce({ ...mockCodeRecord, consumedAt: new Date() } as any);
      const result = await service.check('CONSUMED');
      expect(result).toBeNull();
    });
  });

  describe('isLinkValid', () => {
    it('returns true when link is within lifetime', async () => {
      convRepo.findByUserId.mockResolvedValueOnce([{ linkExpiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) } as any]);

      const valid = await service.isLinkValid('user-1');
      expect(valid).toBe(true);
    });

    it('returns false when link has expired', async () => {
      convRepo.findByUserId.mockResolvedValueOnce([{ linkExpiresAt: new Date(Date.now() - 60_000) } as any]);

      const valid = await service.isLinkValid('user-1');
      expect(valid).toBe(false);
    });

    it('returns false when user has no conversations', async () => {
      convRepo.findByUserId.mockResolvedValueOnce([]);

      const valid = await service.isLinkValid('user-1');
      expect(valid).toBe(false);
    });
  });
});
