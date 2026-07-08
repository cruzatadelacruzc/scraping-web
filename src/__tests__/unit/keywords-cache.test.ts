// Declare mock fns before jest.mock (which is hoisted)
const mockFindByIdFn = jest.fn();
const mockFindByIdAndUpdate = jest.fn();
const mockCreateIndex = jest.fn();

jest.mock('mongoose', () => ({
  ...jest.requireActual('mongoose'),
  model: jest.fn(() => ({
    findById: jest.fn(() => ({ lean: jest.fn(() => ({ exec: mockFindByIdFn })) })),
    findByIdAndUpdate: jest.fn(() => ({
      lean: jest.fn(() => ({ exec: mockFindByIdAndUpdate })),
    })),
    collection: { createIndex: mockCreateIndex },
  })),
  Schema: jest.requireActual('mongoose').Schema,
}));

import { KeywordsCache } from '@scrapers/services/attribute-extractor/keywords-cache';

describe('KeywordsCache', () => {
  let cache: KeywordsCache;

  beforeEach(() => {
    mockFindByIdFn.mockReset();
    mockFindByIdAndUpdate.mockReset();
    mockCreateIndex.mockReset();

    cache = new KeywordsCache({} as any);
  });

  describe('hash', () => {
    it('produces the same key for identical descriptions', () => {
      const a = KeywordsCache.hash('Casa en Miramar');
      const b = KeywordsCache.hash('Casa en Miramar');
      expect(a).toBe(b);
    });

    it('produces different keys for different descriptions', () => {
      const a = KeywordsCache.hash('Casa en Miramar');
      const b = KeywordsCache.hash('Apto en Vedado');
      expect(a).not.toBe(b);
    });

    it('is case and whitespace insensitive', () => {
      const a = KeywordsCache.hash('  Casa en Miramar  ');
      const b = KeywordsCache.hash('casa en miramar');
      expect(a).toBe(b);
    });
  });

  describe('memory cache', () => {
    it('returns cached keywords without hitting MongoDB', async () => {
      await cache.set('Casa en Miramar', ['casa', 'miramar']);
      const result = await cache.get('Casa en Miramar');

      expect(result).toEqual(['casa', 'miramar']);
    });

    it('promotes MongoDB hits to memory', async () => {
      mockFindByIdFn.mockResolvedValue({ _id: 'abc123', keywords: ['apto', 'vedado'] });

      const result1 = await cache.get('Apto en Vedado');
      expect(result1).toEqual(['apto', 'vedado']);

      const result2 = await cache.get('Apto en Vedado');
      expect(result2).toEqual(['apto', 'vedado']);
    });

    it('returns null for cache miss', async () => {
      mockFindByIdFn.mockResolvedValue(null);

      const result = await cache.get('Nunca visto antes');
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('writes to memory immediately', async () => {
      mockFindByIdAndUpdate.mockResolvedValue({});
      await cache.set('desc', ['k1', 'k2']);

      const result = await cache.get('desc');
      expect(result).toEqual(['k1', 'k2']);
    });

    it('survives MongoDB write failure', async () => {
      mockFindByIdAndUpdate.mockRejectedValue(new Error('Mongo down'));
      await cache.set('desc', ['k1']);

      const result = await cache.get('desc');
      expect(result).toEqual(['k1']);
    });
  });

  describe('MongoDB failure', () => {
    it('returns null on read failure (memory miss + Mongo down)', async () => {
      mockFindByIdFn.mockImplementation(() => {
        throw new Error('Connection refused');
      });

      const result = await cache.get('test');
      expect(result).toBeNull();
    });
  });
});
