import { ScraperConfigRegistryService } from '@scrapers/revolico/services/scraping/scraper-config-registry.service';
import { JsonataExtractionError } from '@scrapers/revolico/errors/jsonata-extraction.error';
import type { ScraperConfigRepository } from '@scrapers/revolico/services/scraping/repositories/scraper-config.repository';
import type { ScraperConfigModel } from '@scrapers/revolico/services/scraping/repositories/scraper-config.repository';
import type { ILogger } from '@shared/logger.interface';

const loggerStub: ILogger = {
  context: 'ScraperConfigRegistryService',
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(),
};

const makeConfig = (overrides: Partial<ScraperConfigModel> = {}): ScraperConfigModel =>
  ({
    id: 'cfg-1',
    storeKey: 'revolico:listing',
    expression: '{ "a": 1 }',
    version: 1,
    enabled: true,
    createdAt: new Date('2026-06-23T00:00:00Z'),
    updatedAt: new Date('2026-06-23T00:00:00Z'),
    ...overrides,
  }) as ScraperConfigModel;

const buildRepoMock = (impl?: jest.Mock): jest.Mocked<ScraperConfigRepository> => {
  const findByKey = impl ?? jest.fn();
  return {
    findByKey,
  } as unknown as jest.Mocked<ScraperConfigRepository>;
};

describe('ScraperConfigRegistryService', () => {
  let repoMock: jest.Mocked<ScraperConfigRepository>;
  let registry: ScraperConfigRegistryService;

  beforeEach(() => {
    jest.useRealTimers();
    repoMock = buildRepoMock();
    registry = new ScraperConfigRegistryService(repoMock, loggerStub);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('get', () => {
    it('returns the config from the repo on first call and caches it', async () => {
      repoMock.findByKey.mockResolvedValueOnce(makeConfig());
      const first = await registry.get('revolico:listing');
      expect(first.storeKey).toBe('revolico:listing');
      expect(repoMock.findByKey).toHaveBeenCalledTimes(1);

      const second = await registry.get('revolico:listing');
      expect(second).toBe(first);
      expect(repoMock.findByKey).toHaveBeenCalledTimes(1);
    });

    it('throws JsonataExtractionError(CONFIG_MISSING) when no row exists', async () => {
      repoMock.findByKey.mockResolvedValueOnce(null);
      let caught: unknown;
      try {
        await registry.get('revolico:missing');
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(JsonataExtractionError);
      expect((caught as JsonataExtractionError).code).toBe('CONFIG_MISSING');
    });

    it('throws JsonataExtractionError(CONFIG_DISABLED) when the row is disabled', async () => {
      repoMock.findByKey.mockResolvedValueOnce(makeConfig({ enabled: false }));
      let caught: unknown;
      try {
        await registry.get('revolico:listing');
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(JsonataExtractionError);
      expect((caught as JsonataExtractionError).code).toBe('CONFIG_DISABLED');
    });

    it('refetches after TTL expires', async () => {
      jest.useFakeTimers({ now: 1_700_000_000_000 });
      repoMock.findByKey.mockResolvedValue(makeConfig());
      await registry.get('revolico:listing');
      expect(repoMock.findByKey).toHaveBeenCalledTimes(1);
      jest.advanceTimersByTime(31_000);
      await registry.get('revolico:listing');
      expect(repoMock.findByKey).toHaveBeenCalledTimes(2);
    });
  });

  describe('invalidate', () => {
    it('clears the cached entry forcing the next get to re-query the repo', async () => {
      repoMock.findByKey.mockResolvedValue(makeConfig());
      await registry.get('revolico:listing');
      expect(repoMock.findByKey).toHaveBeenCalledTimes(1);
      registry.invalidate('revolico:listing');
      await registry.get('revolico:listing');
      expect(repoMock.findByKey).toHaveBeenCalledTimes(2);
    });

    it('is a no-op for unknown storeKeys', () => {
      expect(() => registry.invalidate('revolico:never-fetched')).not.toThrow();
    });
  });
});
