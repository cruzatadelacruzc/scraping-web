import { AttributeExtractorService } from '@scrapers/services/attribute-extractor/attribute-extractor.service';
import { RuleBasedExtractorService } from '@scrapers/services/attribute-extractor/rule-based-extractor.service';
import { KeywordsCache } from '@scrapers/services/attribute-extractor/keywords-cache';
import { ILogger } from '@shared/logger.interface';

// Mock the standalone LLM function
jest.mock('@scrapers/services/attribute-extractor/llm-extractor.service', () => ({
  extractKeywords: jest.fn(),
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

    service = new AttributeExtractorService(
      rulesMock as RuleBasedExtractorService,
      cacheMock,
      promptRegistryMock,
      makeLogger() as unknown as ILogger,
    );
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
