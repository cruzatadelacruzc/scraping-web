import { extractKeywords } from '@scrapers/services/attribute-extractor/llm-extractor.service';

// Mock the `ai` module's generateText (no more Output.object — we use json_object + manual parse)
jest.mock('ai', () => ({
  generateText: jest.fn(),
}));

import { generateText } from 'ai';

const mockGenerateText = generateText as jest.MockedFunction<typeof generateText>;

function makeLogger(): { warn: jest.Mock } {
  return { warn: jest.fn() };
}

describe('extractKeywords (Vercel AI SDK)', () => {
  const envBackup = {
    LLM_BASE_URL: process.env.LLM_BASE_URL,
    LLM_MODEL: process.env.LLM_MODEL,
    LLM_API_KEY: process.env.LLM_API_KEY,
  };

  beforeEach(() => {
    mockGenerateText.mockReset();
    process.env.LLM_BASE_URL = 'https://api.deepseek.com/v1';
    process.env.LLM_MODEL = 'deepseek-v4-flash';
    process.env.LLM_API_KEY = 'sk-test-key';
  });

  afterAll(() => {
    process.env.LLM_BASE_URL = envBackup.LLM_BASE_URL;
    process.env.LLM_MODEL = envBackup.LLM_MODEL;
    process.env.LLM_API_KEY = envBackup.LLM_API_KEY;
  });

  describe('successful extraction', () => {
    it('returns keywords when LLM responds correctly', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: '{"keywords": ["casa", "miramar", "3 cuartos", "garaje", "independiente"]}',
        usage: undefined,
      } as any);

      const result = await extractKeywords('Casa independiente en Miramar 3 cuartos con garaje');

      expect(result.keywords).toHaveLength(5);
      expect(result.keywords).toContain('casa');
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
    });

    it('accepts more than 5 keywords when LLM returns them', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: '{"keywords": ["casa", "miramar", "3 cuartos", "garaje", "independiente", "planta alta", "patio"]}',
        usage: undefined,
      } as any);

      const log = makeLogger();
      const result = await extractKeywords('Casa en Miramar 3 cuartos garaje independiente planta alta patio', log);

      // All 7 keywords are preserved — no artificial truncation
      expect(result.keywords).toHaveLength(7);
      expect(result.keywords).toEqual(['casa', 'miramar', '3 cuartos', 'garaje', 'independiente', 'planta alta', 'patio']);
      expect(log.warn).not.toHaveBeenCalled();
    });

    it('returns usage when provider reports token data', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: '{"keywords": ["iphone", "14 pro"]}',
        usage: {
          inputTokenDetails: { cacheReadTokens: 500, noCacheTokens: 200 },
          outputTokens: 30,
        },
      } as any);

      const result = await extractKeywords('iPhone 14 Pro Max 256GB');

      expect(result.keywords).toEqual(['iphone', '14 pro']);
      expect(result.usage).toEqual({
        promptCacheHitTokens: 500,
        promptCacheMissTokens: 200,
        completionTokens: 30,
      });
    });
  });

  describe('missing environment variables', () => {
    it('returns empty keywords when LLM_BASE_URL is missing', async () => {
      delete process.env.LLM_BASE_URL;
      const log = makeLogger();

      const result = await extractKeywords('algún producto', log);

      expect(result.keywords).toEqual([]);
      expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('LLM_BASE_URL'));
      expect(mockGenerateText).not.toHaveBeenCalled();
    });

    it('returns empty keywords when LLM_MODEL is missing', async () => {
      delete process.env.LLM_MODEL;
      const log = makeLogger();

      const result = await extractKeywords('algún producto', log);

      expect(result.keywords).toEqual([]);
      expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('LLM_MODEL'));
    });

    it('returns empty keywords when LLM_API_KEY is missing', async () => {
      delete process.env.LLM_API_KEY;
      const log = makeLogger();

      const result = await extractKeywords('algún producto', log);

      expect(result.keywords).toEqual([]);
      expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('LLM_API_KEY'));
    });
  });

  describe('empty input', () => {
    it('returns empty keywords for empty string', async () => {
      const result = await extractKeywords('');
      expect(result.keywords).toEqual([]);
      expect(mockGenerateText).not.toHaveBeenCalled();
    });

    it('returns empty keywords for whitespace-only', async () => {
      const result = await extractKeywords('   ');
      expect(result.keywords).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('returns empty keywords on generateText failure', async () => {
      mockGenerateText.mockRejectedValueOnce(new Error('Rate limit exceeded'));

      const log = makeLogger();
      const result = await extractKeywords('producto con error', log);

      expect(result.keywords).toEqual([]);
      expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('Rate limit exceeded'));
    });

    it('returns empty keywords on timeout', async () => {
      mockGenerateText.mockRejectedValueOnce(new Error('ETIMEDOUT'));

      const result = await extractKeywords('producto con timeout', makeLogger());
      expect(result.keywords).toEqual([]);
    });

    it('handles undefined logger gracefully', async () => {
      mockGenerateText.mockRejectedValueOnce(new Error('boom'));

      const result = await extractKeywords('test');
      expect(result.keywords).toEqual([]);
    });
  });
});
