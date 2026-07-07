import { extractKeywords } from '@scrapers/services/attribute-extractor/llm-extractor.service';

// Mock the `ai` module's generateObject
jest.mock('ai', () => ({
  generateObject: jest.fn(),
}));

import { generateObject } from 'ai';

const mockGenerateObject = generateObject as jest.MockedFunction<typeof generateObject>;

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
    mockGenerateObject.mockReset();
    process.env.LLM_BASE_URL = 'https://api.deepseek.com/v1';
    process.env.LLM_MODEL = 'deepseek-chat';
    process.env.LLM_API_KEY = 'sk-test-key';
  });

  afterAll(() => {
    process.env.LLM_BASE_URL = envBackup.LLM_BASE_URL;
    process.env.LLM_MODEL = envBackup.LLM_MODEL;
    process.env.LLM_API_KEY = envBackup.LLM_API_KEY;
  });

  describe('successful extraction', () => {
    it('returns keywords when LLM responds correctly', async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: { keywords: ['casa', 'miramar', '3 cuartos', 'garaje', 'independiente'] },
      } as any);

      const result = await extractKeywords('Casa independiente en Miramar 3 cuartos con garaje');

      expect(result.keywords).toHaveLength(5);
      expect(result.keywords).toContain('casa');
      expect(mockGenerateObject).toHaveBeenCalledTimes(1);
    });
  });

  describe('missing environment variables', () => {
    it('returns empty keywords when LLM_BASE_URL is missing', async () => {
      delete process.env.LLM_BASE_URL;
      const log = makeLogger();

      const result = await extractKeywords('algún producto', log);

      expect(result.keywords).toEqual([]);
      expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('LLM_BASE_URL'));
      expect(mockGenerateObject).not.toHaveBeenCalled();
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
      expect(mockGenerateObject).not.toHaveBeenCalled();
    });

    it('returns empty keywords for whitespace-only', async () => {
      const result = await extractKeywords('   ');
      expect(result.keywords).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('returns empty keywords on generateObject failure', async () => {
      mockGenerateObject.mockRejectedValueOnce(new Error('Rate limit exceeded'));

      const log = makeLogger();
      const result = await extractKeywords('producto con error', log);

      expect(result.keywords).toEqual([]);
      expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('Rate limit exceeded'));
    });

    it('returns empty keywords on timeout', async () => {
      mockGenerateObject.mockRejectedValueOnce(new Error('ETIMEDOUT'));

      const result = await extractKeywords('producto con timeout', makeLogger());
      expect(result.keywords).toEqual([]);
    });

    it('handles undefined logger gracefully', async () => {
      mockGenerateObject.mockRejectedValueOnce(new Error('boom'));

      const result = await extractKeywords('test');
      expect(result.keywords).toEqual([]);
      // should not throw even without logger
    });
  });
});
