import 'reflect-metadata';
import { LinkCodeService } from '@bots/services/link-code.service';
import { LinkCodeRepository } from '@bots/repositories/link-code.repository';
import { nanoid } from 'nanoid';

jest.mock('nanoid', () => ({ nanoid: jest.fn() }));

const mockNanoid = nanoid as jest.MockedFunction<typeof nanoid>;

describe('LinkCodeService', () => {
  let service: LinkCodeService;
  let repo: jest.Mocked<LinkCodeRepository>;
  const log = { debug: jest.fn(), warn: jest.fn(), error: jest.fn(), context: '' } as any;

  const mockCode = {
    id: 'code-id-1',
    code: 'ABC123',
    userId: 'user-1',
    accountId: 'tenant-1',
    expiresAt: new Date(Date.now() + 600_000),
    consumedAt: null,
    createdAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BOT_LINK_CODE_TTL_MINUTES = '10';
    mockNanoid.mockReturnValue('ABC123');

    repo = {
      create: jest.fn(),
      findByCode: jest.fn(),
      consume: jest.fn(),
      findExpired: jest.fn(),
    } as any;

    service = new LinkCodeService(log, repo);
  });

  describe('generate', () => {
    it('creates a 6-char code for the given user and account', async () => {
      repo.create.mockResolvedValueOnce(mockCode);

      const result = await service.generate('user-1', 'tenant-1');

      expect(mockNanoid).toHaveBeenCalledWith(6);
      expect(repo.create).toHaveBeenCalledWith({
        code: 'ABC123',
        userId: 'user-1',
        accountId: 'tenant-1',
        expiresAt: expect.any(Date),
      });
      expect(result).toEqual(mockCode);
    });

    it('uses the env TTL to compute expiresAt', async () => {
      process.env.BOT_LINK_CODE_TTL_MINUTES = '5';
      const svc = new LinkCodeService(log, repo as any);
      repo.create.mockImplementation(async data => {
        const diff = data.expiresAt.getTime() - Date.now();
        expect(diff).toBeGreaterThan(4 * 60 * 1000);
        expect(diff).toBeLessThan(7 * 60 * 1000);
        return { ...mockCode, expiresAt: data.expiresAt };
      });

      await svc.generate('user-1', 'tenant-1');
    });

    it('defaults to 10 minutes when env var is unset', async () => {
      delete process.env.BOT_LINK_CODE_TTL_MINUTES;
      const svc = new LinkCodeService(log, repo as any);
      repo.create.mockImplementation(async data => {
        const diff = data.expiresAt.getTime() - Date.now();
        expect(diff).toBeGreaterThan(9 * 60 * 1000);
        expect(diff).toBeLessThan(12 * 60 * 1000);
        return { ...mockCode, expiresAt: data.expiresAt };
      });

      await svc.generate('user-1', 'tenant-1');
    });
  });

  describe('validate', () => {
    it('returns the code record when found and not expired and not consumed', async () => {
      repo.findByCode.mockResolvedValueOnce(mockCode);

      const result = await service.validate('ABC123');

      expect(repo.findByCode).toHaveBeenCalledWith('ABC123');
      expect(result).toEqual(mockCode);
    });

    it('returns null when the code does not exist', async () => {
      repo.findByCode.mockResolvedValueOnce(null);
      const result = await service.validate('MISSING');
      expect(result).toBeNull();
    });

    it('returns null when the code is expired', async () => {
      const expired = { ...mockCode, expiresAt: new Date(Date.now() - 60_000) };
      repo.findByCode.mockResolvedValueOnce(expired);
      const result = await service.validate('EXPIRED');
      expect(result).toBeNull();
    });

    it('returns null when the code is already consumed', async () => {
      const consumed = { ...mockCode, consumedAt: new Date(Date.now() - 60_000) };
      repo.findByCode.mockResolvedValueOnce(consumed);
      const result = await service.validate('CONSUMED');
      expect(result).toBeNull();
    });
  });

  describe('consume', () => {
    it('marks the code as consumed', async () => {
      repo.consume.mockResolvedValueOnce({ ...mockCode, consumedAt: new Date() });

      const result = await service.consume('code-id-1');

      expect(repo.consume).toHaveBeenCalledWith('code-id-1');
      expect(result.consumedAt).toBeInstanceOf(Date);
    });
  });
});
