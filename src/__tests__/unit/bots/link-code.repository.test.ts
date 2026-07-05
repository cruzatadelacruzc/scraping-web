import 'reflect-metadata';
import { LinkCodeRepository } from '@bots/repositories/link-code.repository';

jest.mock('@users/custom-prisma-client', () => ({
  __esModule: true,
  default: {
    botLinkCode: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  },
  isPrismaUniqueConstraintError: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockPrisma = require('@users/custom-prisma-client').default;

describe('LinkCodeRepository', () => {
  let repo: LinkCodeRepository;

  const fakeCode = {
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
    repo = new LinkCodeRepository(mockPrisma);
  });

  describe('create', () => {
    it('calls prisma.botLinkCode.create with the given data and returns the record', async () => {
      mockPrisma.botLinkCode.create.mockResolvedValueOnce(fakeCode);

      const input = { code: 'ABC123', userId: 'user-1', accountId: 'tenant-1', expiresAt: fakeCode.expiresAt };
      const result = await repo.create(input);

      expect(mockPrisma.botLinkCode.create).toHaveBeenCalledWith({ data: input });
      expect(result).toEqual(fakeCode);
    });

    it('propagates prisma errors', async () => {
      mockPrisma.botLinkCode.create.mockRejectedValueOnce(new Error('db error'));
      await expect(repo.create({ code: 'X', userId: 'u', accountId: 'a', expiresAt: new Date() })).rejects.toThrow('db error');
    });
  });

  describe('findByCode', () => {
    it('returns the record when found', async () => {
      mockPrisma.botLinkCode.findFirst.mockResolvedValueOnce(fakeCode);

      const result = await repo.findByCode('ABC123');

      expect(mockPrisma.botLinkCode.findFirst).toHaveBeenCalledWith({ where: { code: 'ABC123' } });
      expect(result).toEqual(fakeCode);
    });

    it('returns null when not found', async () => {
      mockPrisma.botLinkCode.findFirst.mockResolvedValueOnce(null);
      const result = await repo.findByCode('MISSING');
      expect(result).toBeNull();
    });

    it('propagates prisma errors', async () => {
      mockPrisma.botLinkCode.findFirst.mockRejectedValueOnce(new Error('db error'));
      await expect(repo.findByCode('X')).rejects.toThrow('db error');
    });
  });

  describe('consume', () => {
    it('sets consumedAt to a Date on the given id', async () => {
      const consumed = { ...fakeCode, consumedAt: new Date() };
      mockPrisma.botLinkCode.update.mockResolvedValueOnce(consumed);

      const result = await repo.consume('code-id-1');

      expect(mockPrisma.botLinkCode.update).toHaveBeenCalledWith({
        where: { id: 'code-id-1' },
        data: { consumedAt: expect.any(Date), status: 'CONSUMED' },
      });
      expect(result.consumedAt).toBeInstanceOf(Date);
    });

    it('propagates prisma errors', async () => {
      mockPrisma.botLinkCode.update.mockRejectedValueOnce(new Error('db error'));
      await expect(repo.consume('id')).rejects.toThrow('db error');
    });
  });

  describe('findExpired', () => {
    it('queries for records past expiresAt with null consumedAt', async () => {
      mockPrisma.botLinkCode.findMany.mockResolvedValueOnce([fakeCode]);

      const result = await repo.findExpired();

      expect(mockPrisma.botLinkCode.findMany).toHaveBeenCalledWith({
        where: { expiresAt: { lt: expect.any(Date) }, consumedAt: null },
      });
      expect(result).toHaveLength(1);
    });

    it('returns empty array when none found', async () => {
      mockPrisma.botLinkCode.findMany.mockResolvedValueOnce([]);
      const result = await repo.findExpired();
      expect(result).toEqual([]);
    });
  });
});
