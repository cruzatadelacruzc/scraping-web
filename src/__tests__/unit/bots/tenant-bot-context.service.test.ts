import 'reflect-metadata';
import { TenantBotContextService } from '@bots/services/tenant-bot-context.service';
import { BotConversationRepository } from '@bots/repositories/bot-conversation.repository';
import { runWithRequestContext } from '@shared/tenant-context-als';

jest.mock('@shared/tenant-context-als', () => ({
  runWithRequestContext: jest.fn((_ctx: any, fn: () => any) => fn()),
  getRequestContext: jest.fn(),
  TenantContext: jest.fn(),
}));

describe('TenantBotContextService', () => {
  let service: TenantBotContextService;
  let repo: jest.Mocked<BotConversationRepository>;
  const log = { debug: jest.fn(), warn: jest.fn(), error: jest.fn(), context: '' } as any;

  const fakeConv = {
    id: 'conv-id-1',
    accountId: 'tenant-1',
    userId: 'user-1',
    provider: 'whatsapp',
    externalId: '+5355001234',
    preferredLang: 'es',
    lastMessage: null,
    lastActivity: new Date(),
    createdAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repo = {
      upsert: jest.fn(),
      findByExternalId: jest.fn(),
      linkUser: jest.fn(),
      updateLastActivity: jest.fn(),
      updatePreferredLang: jest.fn(),
    } as any;

    service = new TenantBotContextService(log, repo);
  });

  describe('resolve', () => {
    it('upserts the conversation and returns its context', async () => {
      repo.upsert.mockResolvedValueOnce(fakeConv);

      const ctx = await service.resolve('whatsapp', '+5355001234');

      expect(repo.upsert).toHaveBeenCalledWith({
        provider: 'whatsapp',
        externalId: '+5355001234',
        accountId: '', // placeholder account — unlinked users get empty
      });
      expect(ctx).toEqual({
        conversationId: 'conv-id-1',
        accountId: 'tenant-1',
        userId: 'user-1',
        preferredLang: 'es',
      });
    });

    it('returns null userId when conversation is not linked', async () => {
      repo.upsert.mockResolvedValueOnce({ ...fakeConv, userId: null });
      const ctx = await service.resolve('whatsapp', '+5355001234');
      expect(ctx.userId).toBeNull();
    });
  });

  describe('wrap', () => {
    it('wraps execution in runWithRequestContext using resolved tenant', async () => {
      repo.upsert.mockResolvedValueOnce(fakeConv);
      const fn = jest.fn().mockResolvedValue('done');

      const result = await service.wrap('whatsapp', '+5355001234', fn);

      expect(runWithRequestContext).toHaveBeenCalledWith({ tenantId: 'tenant-1', userId: 'user-1' }, expect.any(Function));
      expect(result).toBe('done');
    });

    it('still wraps when userId is null (unlinked user)', async () => {
      repo.upsert.mockResolvedValueOnce({ ...fakeConv, userId: null });
      const fn = jest.fn().mockResolvedValue('ok');

      await service.wrap('whatsapp', '+5355001234', fn);

      expect(runWithRequestContext).toHaveBeenCalledWith({ tenantId: 'tenant-1', userId: undefined }, expect.any(Function));
    });
  });
});
