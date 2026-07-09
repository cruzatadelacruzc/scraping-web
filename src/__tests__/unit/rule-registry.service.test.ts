import { RuleRegistryService } from '@scrapers/services/attribute-extractor/rule-registry.service';

// Mock FALLBACK_RULES to keep tests isolated
jest.mock('@scrapers/services/attribute-extractor/rule-fallbacks', () => ({
  FALLBACK_RULES: {
    brands: ['fallback-brand'],
    colors: ['fallback-color'],
    conditions: [],
    propertyTypes: [],
    locations: [],
    warrantyKeywords: [],
  },
}));

describe('RuleRegistryService', () => {
  let registry: RuleRegistryService;
  let mockRepo: {
    findAllEnabled: jest.Mock;
    findByKey: jest.Mock;
  };
  let mockLogger: {
    warn: jest.Mock;
    info: jest.Mock;
    error: jest.Mock;
    context: string;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    mockRepo = {
      findAllEnabled: jest.fn().mockResolvedValue([]),
      findByKey: jest.fn().mockResolvedValue(null),
    };
    mockLogger = { warn: jest.fn(), info: jest.fn(), error: jest.fn(), context: '' };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('construction', () => {
    it('bootstraps cache with fallback values immediately', () => {
      registry = new RuleRegistryService(mockRepo as any, mockLogger as any);
      expect(registry.get('brands')).toEqual(['fallback-brand']);
      expect(registry.get('colors')).toEqual(['fallback-color']);
    });

    it('returns empty array for unknown key', () => {
      registry = new RuleRegistryService(mockRepo as any, mockLogger as any);
      expect(registry.get('nonexistent')).toEqual([]);
    });

    it('does NOT warm from DB on construction (lazy)', () => {
      registry = new RuleRegistryService(mockRepo as any, mockLogger as any);
      expect(mockRepo.findAllEnabled).not.toHaveBeenCalled();
    });

    it('kicks off async DB warm on first get() call', () => {
      registry = new RuleRegistryService(mockRepo as any, mockLogger as any);
      registry.get('brands');
      expect(mockRepo.findAllEnabled).toHaveBeenCalled();
    });
  });

  describe('DB warm', () => {
    it('replaces fallback with DB values after warm completes', async () => {
      mockRepo.findAllEnabled.mockResolvedValue([{ ruleKey: 'brands', values: ['db-brand-1', 'db-brand-2'], enabled: true }]);
      registry = new RuleRegistryService(mockRepo as any, mockLogger as any);
      registry.get('brands'); // trigger lazy warm
      // Wait for the async _warmFromDb to resolve
      await Promise.resolve();
      await Promise.resolve();

      expect(registry.get('brands')).toEqual(['db-brand-1', 'db-brand-2']);
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('warmed'));
    });

    it('keeps fallback values when DB load fails', async () => {
      mockRepo.findAllEnabled.mockRejectedValue(new Error('DB down'));
      registry = new RuleRegistryService(mockRepo as any, mockLogger as any);
      registry.get('brands'); // trigger lazy warm
      await Promise.resolve();
      await Promise.resolve();

      expect(registry.get('brands')).toEqual(['fallback-brand']);
      expect(mockLogger.warn).toHaveBeenCalledWith('Rule registry DB load failed — using hardcoded fallbacks', 'DB down');
    });
  });

  describe('invalidate', () => {
    it('re-fetches the invalidated key from DB', async () => {
      registry = new RuleRegistryService(mockRepo as any, mockLogger as any);
      mockRepo.findByKey.mockResolvedValue({
        ruleKey: 'brands',
        values: ['refreshed-value'],
        enabled: true,
      });
      registry.invalidate('brands');
      // invalidate fires async refresh
      await Promise.resolve();
      await Promise.resolve();

      expect(mockRepo.findByKey).toHaveBeenCalledWith('brands');
      expect(registry.get('brands')).toEqual(['refreshed-value']);
    });
  });

  describe('TTL expiry', () => {
    it('returns stale values on TTL expiry and triggers background refresh', () => {
      registry = new RuleRegistryService(mockRepo as any, mockLogger as any);
      const initial = registry.get('brands');
      // Advance past TTL (30s)
      jest.advanceTimersByTime(31_000);
      const afterExpiry = registry.get('brands');
      // Should still return stale values (not block)
      expect(afterExpiry).toEqual(initial);
    });
  });
});
