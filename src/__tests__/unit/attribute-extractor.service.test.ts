import { AttributeExtractorService } from '@scrapers/services/attribute-extractor/attribute-extractor.service';
import { RuleBasedExtractorService } from '@scrapers/services/attribute-extractor/rule-based-extractor.service';
import { KeywordsCache } from '@scrapers/services/attribute-extractor/keywords-cache';
import { EnrichmentMetricsService } from '@scrapers/services/enrichment-metrics.service';
import { ILogger } from '@shared/logger.interface';

// Mock the standalone LLM function — must export FALLBACK_SYSTEM_PROMPT
// so _loadSystemPrompt() can fall back to it when DB + env var are missing.
jest.mock('@scrapers/services/attribute-extractor/llm-extractor.service', () => ({
  extractKeywords: jest.fn(),
  FALLBACK_SYSTEM_PROMPT: 'You are a classified-ad keyword extraction assistant — MOCK FALLBACK',
}));

import { extractKeywords } from '@scrapers/services/attribute-extractor/llm-extractor.service';

const mockExtractKeywords = extractKeywords as jest.MockedFunction<typeof extractKeywords>;

function makeLogger(): ILogger {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as ILogger;
}

function makeCache(): jest.Mocked<KeywordsCache> {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<KeywordsCache>;
}

describe('AttributeExtractorService', () => {
  let rulesMock: jest.Mocked<RuleBasedExtractorService>;
  let cacheMock: jest.Mocked<KeywordsCache>;
  let service: AttributeExtractorService;

  beforeEach(() => {
    mockExtractKeywords.mockReset();

    rulesMock = {
      extract: jest.fn(),
    } as unknown as jest.Mocked<RuleBasedExtractorService>;

    cacheMock = makeCache();

    const promptRegistryMock = {
      get: jest.fn().mockResolvedValue(null),
    } as any;

    const metricsMock = {
      recordRuleHighConfidence: jest.fn(),
      recordCacheHit: jest.fn(),
      recordCacheMiss: jest.fn(),
      recordLlmCall: jest.fn(),
      recordLlmFailure: jest.fn(),
    } as unknown as EnrichmentMetricsService;

    service = new AttributeExtractorService(
      rulesMock as RuleBasedExtractorService,
      cacheMock,
      promptRegistryMock,
      metricsMock,
      makeLogger() as unknown as ILogger,
    );
  });

  describe('_loadSystemPrompt resolution chain', () => {
    const envBackup = process.env.LLM_KEYWORD_EXTRACTION_PROMPT;

    afterEach(() => {
      delete process.env.LLM_KEYWORD_EXTRACTION_PROMPT;
      if (envBackup) process.env.LLM_KEYWORD_EXTRACTION_PROMPT = envBackup;
    });

    it('uses DB prompt when ScraperConfig row exists', async () => {
      const dbPrompt = 'Custom DB prompt — you are a keyword extraction assistant.';

      // Rebuild service with a registry that returns the DB prompt
      const promptRegistryMock = {
        get: jest.fn().mockResolvedValue({ expression: dbPrompt }),
      } as any;

      const srv = new AttributeExtractorService(
        rulesMock as RuleBasedExtractorService,
        cacheMock,
        promptRegistryMock,
        {
          recordRuleHighConfidence: jest.fn(),
          recordCacheHit: jest.fn(),
          recordCacheMiss: jest.fn(),
          recordLlmCall: jest.fn(),
          recordLlmFailure: jest.fn(),
        } as unknown as EnrichmentMetricsService,
        makeLogger() as unknown as ILogger,
      );

      rulesMock.extract.mockReturnValue({ attributes: {}, confidence: 0, matchedCount: 0 });
      cacheMock.get.mockResolvedValue(null);
      mockExtractKeywords.mockResolvedValue({ keywords: ['test'] });

      await srv.extract('some product');

      // The 3rd argument to extractKeywords is the resolved system prompt
      const systemPromptArg = mockExtractKeywords.mock.calls[0][2];
      expect(systemPromptArg).toBe(dbPrompt);
    });

    it('falls back to LLM_KEYWORD_EXTRACTION_PROMPT env var when DB is missing', async () => {
      const envPrompt = 'Custom env prompt — you are an env-based assistant.';
      process.env.LLM_KEYWORD_EXTRACTION_PROMPT = envPrompt;

      // Rebuild service with a registry that throws (simulating DB missing)
      const promptRegistryMock = {
        get: jest.fn().mockRejectedValue(new Error('CONFIG_MISSING')),
      } as any;

      const log = makeLogger();
      const srv = new AttributeExtractorService(
        rulesMock as RuleBasedExtractorService,
        cacheMock,
        promptRegistryMock,
        {
          recordRuleHighConfidence: jest.fn(),
          recordCacheHit: jest.fn(),
          recordCacheMiss: jest.fn(),
          recordLlmCall: jest.fn(),
          recordLlmFailure: jest.fn(),
        } as unknown as EnrichmentMetricsService,
        log as unknown as ILogger,
      );

      rulesMock.extract.mockReturnValue({ attributes: {}, confidence: 0, matchedCount: 0 });
      cacheMock.get.mockResolvedValue(null);
      mockExtractKeywords.mockResolvedValue({ keywords: ['test'] });

      await srv.extract('some product');

      const systemPromptArg = mockExtractKeywords.mock.calls[0][2];
      expect(systemPromptArg).toBe(envPrompt);
      expect(log.info).toHaveBeenCalledWith('Using LLM_KEYWORD_EXTRACTION_PROMPT from environment');
    });

    it('falls back to hardcoded FALLBACK_SYSTEM_PROMPT when DB and env var are both missing', async () => {
      // Ensure env var is not set
      const savedEnv = process.env.LLM_KEYWORD_EXTRACTION_PROMPT;
      delete process.env.LLM_KEYWORD_EXTRACTION_PROMPT;

      try {
        // Rebuild service with a registry that throws (simulating DB missing)
        const promptRegistryMock = {
          get: jest.fn().mockRejectedValue(new Error('CONFIG_MISSING')),
        } as any;

        const log = makeLogger();
        const localCache = makeCache();
        const srv = new AttributeExtractorService(
          rulesMock as RuleBasedExtractorService,
          localCache,
          promptRegistryMock,
          {
            recordRuleHighConfidence: jest.fn(),
            recordCacheHit: jest.fn(),
            recordCacheMiss: jest.fn(),
            recordLlmCall: jest.fn(),
            recordLlmFailure: jest.fn(),
          } as unknown as EnrichmentMetricsService,
          log as unknown as ILogger,
        );

        rulesMock.extract.mockReturnValue({ attributes: {}, confidence: 0, matchedCount: 0 });
        mockExtractKeywords.mockResolvedValue({ keywords: ['test'] });

        await srv.extract('some product');

        // Verify extractKeywords was called with the fallback prompt as 3rd argument
        expect(mockExtractKeywords).toHaveBeenCalled();
        const systemPromptArg = mockExtractKeywords.mock.calls[0][2];
        expect(systemPromptArg).toContain('MOCK FALLBACK');
        expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('[ALERT]'));
      } finally {
        if (savedEnv) process.env.LLM_KEYWORD_EXTRACTION_PROMPT = savedEnv;
      }
    });
  });

  describe('orchestration', () => {
    it('returns {} for undefined description', async () => {
      const result = await service.extract(undefined);
      expect(result).toEqual({});
      expect(rulesMock.extract).not.toHaveBeenCalled();
      expect(mockExtractKeywords).not.toHaveBeenCalled();
    });

    it('returns {} for empty description', async () => {
      const result = await service.extract('   ');
      expect(result).toEqual({});
    });

    it('uses rules result when confidence >= 0.4 (skip cache & LLM)', async () => {
      rulesMock.extract.mockReturnValue({
        attributes: { brand: 'Apple', color: 'negro', condition: 'nuevo', storage: '256GB', ram: '8GB' },
        confidence: 0.75,
        matchedCount: 5,
      });

      const result = await service.extract('iPhone negro nuevo 256GB 8GB RAM');

      expect(result).toEqual({
        brand: 'Apple',
        color: 'negro',
        condition: 'nuevo',
        storage: '256GB',
        ram: '8GB',
      });
      expect(cacheMock.get).not.toHaveBeenCalled();
      expect(mockExtractKeywords).not.toHaveBeenCalled();
    });

    it('uses cache when rules confidence is low and cache hits', async () => {
      rulesMock.extract.mockReturnValue({
        attributes: { condition: 'nuevo' },
        confidence: 0.125,
        matchedCount: 1,
      });
      cacheMock.get.mockResolvedValue(['samsung', 'galaxy', 'azul']);

      const result = await service.extract('Samsung Galaxy azul');

      expect(result).toEqual({ keywords: ['samsung', 'galaxy', 'azul'] });
      expect(mockExtractKeywords).not.toHaveBeenCalled();
    });

    it('falls back to LLM when cache misses', async () => {
      rulesMock.extract.mockReturnValue({
        attributes: { condition: 'nuevo' },
        confidence: 0.125,
        matchedCount: 1,
      });
      cacheMock.get.mockResolvedValue(null);
      mockExtractKeywords.mockResolvedValue({ keywords: ['xiaomi', 'note'] });

      const result = await service.extract('Xiaomi Note');

      expect(result).toEqual({ keywords: ['xiaomi', 'note'] });
      expect(mockExtractKeywords).toHaveBeenCalledTimes(1);
    });

    it('caches LLM result for future lookups', async () => {
      rulesMock.extract.mockReturnValue({
        attributes: {},
        confidence: 0,
        matchedCount: 0,
      });
      cacheMock.get.mockResolvedValue(null);
      mockExtractKeywords.mockResolvedValue({ keywords: ['casa', 'miramar'] });

      const result = await service.extract('Casa en Miramar');

      expect(result).toEqual({ keywords: ['casa', 'miramar'] });
      expect(cacheMock.set).toHaveBeenCalledWith('Casa en Miramar', ['casa', 'miramar']);
    });

    it('does NOT cache when LLM returns empty keywords', async () => {
      rulesMock.extract.mockReturnValue({
        attributes: {},
        confidence: 0,
        matchedCount: 0,
      });
      cacheMock.get.mockResolvedValue(null);
      mockExtractKeywords.mockResolvedValue({ keywords: [] });

      await service.extract('...');
      expect(cacheMock.set).not.toHaveBeenCalled();
    });

    it('falls back to cache/LLM when rules throw', async () => {
      rulesMock.extract.mockImplementation(() => {
        throw new Error('Regex catastrophe');
      });
      cacheMock.get.mockResolvedValue(null);
      mockExtractKeywords.mockResolvedValue({ keywords: ['xiaomi'] });

      const result = await service.extract('Xiaomi Redmi Note 12');

      expect(result).toEqual({ keywords: ['xiaomi'] });
      expect(mockExtractKeywords).toHaveBeenCalledTimes(1);
    });

    it('returns {} when cache misses and LLM returns empty', async () => {
      rulesMock.extract.mockReturnValue({
        attributes: {},
        confidence: 0,
        matchedCount: 0,
      });
      cacheMock.get.mockResolvedValue(null);
      mockExtractKeywords.mockResolvedValue({ keywords: [] });

      const result = await service.extract('texto genérico sin datos');
      expect(result).toEqual({ keywords: [] });
    });
  });
});
