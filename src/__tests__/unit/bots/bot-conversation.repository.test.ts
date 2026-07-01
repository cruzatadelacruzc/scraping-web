import 'reflect-metadata';
import { BotConversationRepository } from '@bots/repositories/bot-conversation.repository';

jest.mock('@users/custom-prisma-client', () => ({
  __esModule: true,
  default: {
    botConversation: {
      upsert: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
  isPrismaUniqueConstraintError: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockPrisma = require('@users/custom-prisma-client').default;

describe('BotConversationRepository', () => {
  let repo: BotConversationRepository;

  const fakeConv = {
    id: 'conv-id-1',
    accountId: 'tenant-1',
    userId: null,
    provider: 'whatsapp',
    externalId: '+5355001234',
    preferredLang: 'es',
    lastMessage: null,
    lastActivity: new Date(),
    createdAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new BotConversationRepository(mockPrisma);
  });

  describe('upsert', () => {
    it('upserts using provider+externalId composite key and updates lastActivity', async () => {
      mockPrisma.botConversation.upsert.mockResolvedValueOnce(fakeConv);

      const input = { provider: 'whatsapp', externalId: '+5355001234', accountId: 'tenant-1' };
      const result = await repo.upsert(input);

      expect(mockPrisma.botConversation.upsert).toHaveBeenCalledWith({
        where: { provider_externalId: { provider: 'whatsapp', externalId: '+5355001234' } },
        create: input,
        update: { lastActivity: expect.any(Date) },
      });
      expect(result).toEqual(fakeConv);
    });

    it('propagates prisma errors', async () => {
      mockPrisma.botConversation.upsert.mockRejectedValueOnce(new Error('db error'));
      await expect(repo.upsert({ provider: 'whatsapp', externalId: 'x', accountId: 'a' })).rejects.toThrow('db error');
    });
  });

  describe('findByExternalId', () => {
    it('returns the conversation when found', async () => {
      mockPrisma.botConversation.findFirst.mockResolvedValueOnce(fakeConv);

      const result = await repo.findByExternalId('whatsapp', '+5355001234');

      expect(mockPrisma.botConversation.findFirst).toHaveBeenCalledWith({
        where: { provider: 'whatsapp', externalId: '+5355001234' },
      });
      expect(result).toEqual(fakeConv);
    });

    it('returns null when not found', async () => {
      mockPrisma.botConversation.findFirst.mockResolvedValueOnce(null);
      const result = await repo.findByExternalId('whatsapp', 'unknown');
      expect(result).toBeNull();
    });

    it('propagates prisma errors', async () => {
      mockPrisma.botConversation.findFirst.mockRejectedValueOnce(new Error('db error'));
      await expect(repo.findByExternalId('whatsapp', 'x')).rejects.toThrow('db error');
    });
  });

  describe('linkUser', () => {
    it('sets userId on the conversation', async () => {
      const linked = { ...fakeConv, userId: 'user-1' };
      mockPrisma.botConversation.update.mockResolvedValueOnce(linked);

      const result = await repo.linkUser('conv-id-1', 'user-1');

      expect(mockPrisma.botConversation.update).toHaveBeenCalledWith({
        where: { id: 'conv-id-1' },
        data: { userId: 'user-1' },
      });
      expect(result.userId).toBe('user-1');
    });

    it('propagates prisma errors', async () => {
      mockPrisma.botConversation.update.mockRejectedValueOnce(new Error('db error'));
      await expect(repo.linkUser('id', 'uid')).rejects.toThrow('db error');
    });
  });

  describe('updateLastActivity', () => {
    it('sets lastActivity to a current Date', async () => {
      mockPrisma.botConversation.update.mockResolvedValueOnce({ ...fakeConv, lastActivity: new Date() });

      await repo.updateLastActivity('conv-id-1');

      expect(mockPrisma.botConversation.update).toHaveBeenCalledWith({
        where: { id: 'conv-id-1' },
        data: { lastActivity: expect.any(Date) },
      });
    });
  });

  describe('updatePreferredLang', () => {
    it('sets preferredLang on the conversation', async () => {
      mockPrisma.botConversation.update.mockResolvedValueOnce({ ...fakeConv, preferredLang: 'en' });

      await repo.updatePreferredLang('conv-id-1', 'en');

      expect(mockPrisma.botConversation.update).toHaveBeenCalledWith({
        where: { id: 'conv-id-1' },
        data: { preferredLang: 'en' },
      });
    });

    it('propagates prisma errors', async () => {
      mockPrisma.botConversation.update.mockRejectedValueOnce(new Error('db error'));
      await expect(repo.updatePreferredLang('id', 'en')).rejects.toThrow('db error');
    });
  });
});
