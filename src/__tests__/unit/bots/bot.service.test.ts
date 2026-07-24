import 'reflect-metadata';
import { BotService } from '@bots/services/bot.service';

// ---------------------------------------------------------------------------
// Module-level mocks
// ---------------------------------------------------------------------------

jest.mock('@bots/providers/provider-registry', () => ({
  getEnabledBotTypes: jest.fn(),
  resolveProviderEntry: jest.fn(),
}));

type AnyFn = (...args: any[]) => any;

describe('BotService — extension providers', () => {
  let service: BotService;
  let capturedExtensions: Record<string, unknown>;

  // Mock dependencies
  const mockSubsService = { getByAccountId: jest.fn() };
  const mockAlarmService = { getAll: jest.fn() };
  const mockUserRepo = { findById: jest.fn() };
  const mockPlanService = { findById: jest.fn() };
  const mockTenantCtx = { resolve: jest.fn() };
  const mockLinkCode = { verifyAndLink: jest.fn() };

  const log = {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    context: '',
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Ensure env vars are set for provider resolution
    process.env.BOT_ENABLED = 'telegram';
    process.env.BOT_TELEGRAM_PROVIDER = 'telegram';
    process.env.TELEGRAM_BOT_TOKEN = 'fake-token';

    // Setup builderbot mocks that capture extensions
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createBot, createProvider } = require('@builderbot/bot');
    createProvider.mockReturnValue({ stop: jest.fn() });
    createBot.mockImplementation((_flowConfig: any, opts: any) => {
      capturedExtensions = opts.extensions;
      return { httpServer: jest.fn() };
    });

    // Setup provider registry mock
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getEnabledBotTypes, resolveProviderEntry } = require('@bots/providers/provider-registry');
    getEnabledBotTypes.mockReturnValue(['telegram']);
    resolveProviderEntry.mockReturnValue({
      Provider: class {},
      buildConfig: () => ({}),
    });

    // Default tenant resolver returns a linked user
    mockTenantCtx.resolve.mockResolvedValue({
      conversationId: 'conv-1',
      accountId: 'tenant-1',
      userId: 'user-1',
      preferredLang: 'es',
      linkExpiresAt: null,
    });

    service = new BotService(
      log,
      {} as any, // TelegramAdapter
      {} as any, // WhatsAppAdapter
      mockTenantCtx as any,
      mockLinkCode as any,
      mockSubsService as any,
      mockAlarmService as any,
      mockUserRepo as any,
      mockPlanService as any,
    );
  });

  // -----------------------------------------------------------------------
  // Extensions are present
  // -----------------------------------------------------------------------

  describe('start() injects extension providers', () => {
    it('includes subscriptionProvider', async () => {
      await service.start();
      expect(capturedExtensions.subscriptionProvider).toBeDefined();
      expect(typeof capturedExtensions.subscriptionProvider).toBe('function');
    });

    it('includes alarmProvider', async () => {
      await service.start();
      expect(capturedExtensions.alarmProvider).toBeDefined();
      expect(typeof capturedExtensions.alarmProvider).toBe('function');
    });

    it('includes profileProvider', async () => {
      await service.start();
      expect(capturedExtensions.profileProvider).toBeDefined();
      expect(typeof capturedExtensions.profileProvider).toBe('function');
    });

    it('includes aiHandler', async () => {
      await service.start();
      expect(capturedExtensions.aiHandler).toBeDefined();
      expect(typeof capturedExtensions.aiHandler).toBe('function');
    });

    it('includes tenantResolver', async () => {
      await service.start();
      expect(capturedExtensions.tenantResolver).toBeDefined();
      expect(typeof capturedExtensions.tenantResolver).toBe('function');
    });
  });

  // -----------------------------------------------------------------------
  // Tenant context sharing via extensions bag
  // -----------------------------------------------------------------------

  describe('tenantResolver stores context on extensions', () => {
    it('sets _currentBotCtx after resolution', async () => {
      await service.start();

      const result = await (capturedExtensions.tenantResolver as AnyFn)('ext-123');

      expect(result).toEqual({
        conversationId: 'conv-1',
        accountId: 'tenant-1',
        userId: 'user-1',
        preferredLang: 'es',
        linkExpiresAt: null,
      });
      expect(capturedExtensions._currentBotCtx).toEqual(result);
    });
  });

  // -----------------------------------------------------------------------
  // subscriptionProvider
  // -----------------------------------------------------------------------

  describe('subscriptionProvider', () => {
    it('returns plan info when account has an active subscription', async () => {
      await service.start();
      await (capturedExtensions.tenantResolver as AnyFn)('ext-123');

      mockSubsService.getByAccountId.mockResolvedValue([
        {
          id: 'sub-1',
          accountId: 'tenant-1',
          planId: 'plan-1',
          status: 'ACTIVE',
          periodEnd: new Date('2025-12-31T23:59:59Z'),
        },
      ]);
      mockPlanService.findById.mockResolvedValue({ name: 'Premium Plan' });

      const result = await (capturedExtensions.subscriptionProvider as AnyFn)();

      expect(result).toEqual({
        planName: 'Premium Plan',
        expiresAt: expect.any(String),
      });
      expect(mockSubsService.getByAccountId).toHaveBeenCalledWith('tenant-1');
    });

    it('prefers trialing subscription when no active one exists', async () => {
      await service.start();
      await (capturedExtensions.tenantResolver as AnyFn)('ext-123');

      mockSubsService.getByAccountId.mockResolvedValue([
        {
          id: 'sub-2',
          accountId: 'tenant-1',
          planId: 'plan-2',
          status: 'TRIALING',
          periodEnd: new Date('2025-06-30'),
        },
      ]);
      mockPlanService.findById.mockResolvedValue({ name: 'Trial' });

      const result = await (capturedExtensions.subscriptionProvider as AnyFn)();

      expect(result).toEqual({
        planName: 'Trial',
        expiresAt: expect.any(String),
      });
    });

    it('returns null when no active/trialing subscription exists', async () => {
      await service.start();
      await (capturedExtensions.tenantResolver as AnyFn)('ext-123');

      mockSubsService.getByAccountId.mockResolvedValue([]);

      const result = await (capturedExtensions.subscriptionProvider as AnyFn)();
      expect(result).toBeNull();
    });

    it('returns null when accountId is not available', async () => {
      await service.start();
      // Don't call tenantResolver — _currentBotCtx remains undefined

      const result = await (capturedExtensions.subscriptionProvider as AnyFn)();
      expect(result).toBeNull();
    });

    it('returns subscription info even when plan lookup fails', async () => {
      await service.start();
      await (capturedExtensions.tenantResolver as AnyFn)('ext-123');

      mockSubsService.getByAccountId.mockResolvedValue([
        {
          id: 'sub-3',
          accountId: 'tenant-1',
          planId: 'plan-3',
          status: 'ACTIVE',
          periodEnd: new Date('2025-12-31'),
        },
      ]);
      mockPlanService.findById.mockRejectedValue(new Error('Plan not found'));

      const result = await (capturedExtensions.subscriptionProvider as AnyFn)();

      expect(result).toEqual({
        planName: undefined,
        expiresAt: expect.any(String),
      });
    });
  });

  // -----------------------------------------------------------------------
  // alarmProvider
  // -----------------------------------------------------------------------

  describe('alarmProvider', () => {
    it('returns mapped alarms for the account', async () => {
      await service.start();
      await (capturedExtensions.tenantResolver as AnyFn)('ext-123');

      mockAlarmService.getAll.mockResolvedValue([
        { name: 'Price drop monitor', threshold: 150 },
        { name: 'Keyboard price alert', threshold: 75.5 },
      ]);

      const result = await (capturedExtensions.alarmProvider as AnyFn)();

      expect(result).toEqual([
        { productName: 'Price drop monitor', currentPrice: '150' },
        { productName: 'Keyboard price alert', currentPrice: '75.5' },
      ]);
      expect(mockAlarmService.getAll).toHaveBeenCalled();
    });

    it('returns empty array when no alarms exist', async () => {
      await service.start();
      await (capturedExtensions.tenantResolver as AnyFn)('ext-123');

      mockAlarmService.getAll.mockResolvedValue([]);

      const result = await (capturedExtensions.alarmProvider as AnyFn)();
      expect(result).toEqual([]);
    });

    it('returns empty array when accountId is not available', async () => {
      await service.start();
      // Don't call tenantResolver

      const result = await (capturedExtensions.alarmProvider as AnyFn)();
      expect(result).toEqual([]);
    });

    it('handles service errors gracefully', async () => {
      await service.start();
      await (capturedExtensions.tenantResolver as AnyFn)('ext-123');

      mockAlarmService.getAll.mockRejectedValue(new Error('DB error'));

      const result = await (capturedExtensions.alarmProvider as AnyFn)();
      expect(result).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // profileProvider
  // -----------------------------------------------------------------------

  describe('profileProvider', () => {
    it('returns displayName and email for the linked user', async () => {
      await service.start();
      await (capturedExtensions.tenantResolver as AnyFn)('ext-123');

      mockUserRepo.findById.mockResolvedValue({
        id: 'user-1',
        displayName: 'John Doe',
        username: 'johndoe',
        email: 'john@example.com',
      });

      const result = await (capturedExtensions.profileProvider as AnyFn)();

      expect(result).toEqual({
        displayName: 'John Doe',
        email: 'john@example.com',
      });
      expect(mockUserRepo.findById).toHaveBeenCalledWith('user-1');
    });

    it('falls back to username when displayName is not set', async () => {
      await service.start();
      await (capturedExtensions.tenantResolver as AnyFn)('ext-123');

      mockUserRepo.findById.mockResolvedValue({
        id: 'user-1',
        displayName: null,
        username: 'johndoe',
        email: 'john@example.com',
      });

      const result = await (capturedExtensions.profileProvider as AnyFn)();

      expect(result).toEqual({
        displayName: 'johndoe',
        email: 'john@example.com',
      });
    });

    it('returns null when user is not found', async () => {
      await service.start();
      await (capturedExtensions.tenantResolver as AnyFn)('ext-123');

      mockUserRepo.findById.mockResolvedValue(null);

      const result = await (capturedExtensions.profileProvider as AnyFn)();
      expect(result).toBeNull();
    });

    it('returns null when userId is not available', async () => {
      await service.start();
      // Don't call tenantResolver

      const result = await (capturedExtensions.profileProvider as AnyFn)();
      expect(result).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // aiHandler
  // -----------------------------------------------------------------------

  describe('aiHandler', () => {
    it('returns a Spanish message when lang is es', async () => {
      await service.start();

      const result = await (capturedExtensions.aiHandler as AnyFn)('Hola', 'es');
      expect(result).toContain('IA');
      expect(result).toMatch(/no.+disponible/);
    });

    it('returns an English message when lang is en', async () => {
      await service.start();

      const result = await (capturedExtensions.aiHandler as AnyFn)('Hello', 'en');
      expect(result).toContain('AI');
      expect(result).toContain('not available');
    });

    it('defaults to Spanish for unknown languages', async () => {
      await service.start();

      const result = await (capturedExtensions.aiHandler as AnyFn)('Bonjour', 'fr');
      expect(result).toContain('IA');
      expect(result).toMatch(/no.+disponible/);
    });
  });
});
