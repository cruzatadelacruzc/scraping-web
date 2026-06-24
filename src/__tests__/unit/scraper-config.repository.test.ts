import { ScraperConfigRepository } from '@scrapers/revolico/services/scraping/repositories/scraper-config.repository';
import type { JsonataRunnerService, JsonataValidationResult } from '@scrapers/revolico/services/scraping/jsonata-runner.service';

interface IFakeScraperConfig {
  id: string;
  storeKey: string;
  expression: string;
  version: number;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const makeConfig = (overrides: Partial<IFakeScraperConfig> = {}): IFakeScraperConfig => ({
  id: 'cfg-1',
  storeKey: 'revolico:listing',
  expression: '{ "ok": true }',
  version: 1,
  enabled: true,
  createdAt: new Date('2026-06-23T00:00:00Z'),
  updatedAt: new Date('2026-06-23T00:00:00Z'),
  ...overrides,
});

type PrismaMock = {
  scraperConfig: { findUnique: jest.Mock; upsert: jest.Mock };
  __esModule: true;
  default: { scraperConfig: { findUnique: jest.Mock; upsert: jest.Mock } };
};

const buildPrismaMock = (): PrismaMock => {
  const scraperConfig = {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  };
  return {
    scraperConfig,
    __esModule: true,
    default: { scraperConfig },
  };
};

const buildRunnerMock = (validateImpl?: (expr: string) => JsonataValidationResult): jest.Mocked<JsonataRunnerService> => {
  return {
    validate: jest.fn(validateImpl ?? ((): JsonataValidationResult => ({ ok: true }))),
  } as unknown as jest.Mocked<JsonataRunnerService>;
};

describe('ScraperConfigRepository', () => {
  let prismaMock: ReturnType<typeof buildPrismaMock>;
  let runnerMock: jest.Mocked<JsonataRunnerService>;
  let repo: ScraperConfigRepository;

  beforeEach(() => {
    prismaMock = buildPrismaMock();
    runnerMock = buildRunnerMock();
    repo = new ScraperConfigRepository(prismaMock.default as never, runnerMock);
  });

  describe('findByKey', () => {
    it('returns the row when found', async () => {
      const cfg = makeConfig();
      prismaMock.scraperConfig.findUnique.mockResolvedValueOnce(cfg);
      const result = await repo.findByKey('revolico:listing');
      expect(result).toEqual(cfg);
      expect(prismaMock.scraperConfig.findUnique).toHaveBeenCalledWith({ where: { storeKey: 'revolico:listing' } });
    });

    it('returns null when no row exists', async () => {
      prismaMock.scraperConfig.findUnique.mockResolvedValueOnce(null);
      const result = await repo.findByKey('revolico:missing');
      expect(result).toBeNull();
    });
  });

  describe('findEnabledByKey', () => {
    it('returns the row when enabled=true', async () => {
      const cfg = makeConfig({ enabled: true });
      prismaMock.scraperConfig.findUnique.mockResolvedValueOnce(cfg);
      const result = await repo.findEnabledByKey('revolico:listing');
      expect(result).toEqual(cfg);
    });

    it('returns null when the row is disabled', async () => {
      prismaMock.scraperConfig.findUnique.mockResolvedValueOnce(makeConfig({ enabled: false }));
      const result = await repo.findEnabledByKey('revolico:listing');
      expect(result).toBeNull();
    });

    it('returns null when the row does not exist', async () => {
      prismaMock.scraperConfig.findUnique.mockResolvedValueOnce(null);
      const result = await repo.findEnabledByKey('revolico:missing');
      expect(result).toBeNull();
    });
  });

  describe('upsert', () => {
    it('refuses to persist when runner.validate returns { ok: false }', async () => {
      runnerMock.validate.mockReturnValueOnce({ ok: false, error: 'Syntax error' });
      await expect(repo.upsert('revolico:listing', ')(')).rejects.toThrow(/invalid jsonata/i);
      expect(prismaMock.scraperConfig.upsert).not.toHaveBeenCalled();
    });

    it('persists when runner.validate returns { ok: true }', async () => {
      runnerMock.validate.mockReturnValueOnce({ ok: true });
      const persisted = makeConfig({ expression: '{ "a": 1 }', version: 2 });
      prismaMock.scraperConfig.upsert.mockResolvedValueOnce(persisted);
      const result = await repo.upsert('revolico:listing', '{ "a": 1 }');
      expect(result).toEqual(persisted);
      expect(runnerMock.validate).toHaveBeenCalledWith('{ "a": 1 }');
      expect(prismaMock.scraperConfig.upsert).toHaveBeenCalledWith({
        where: { storeKey: 'revolico:listing' },
        create: { storeKey: 'revolico:listing', expression: '{ "a": 1 }' },
        update: { expression: '{ "a": 1 }' },
      });
    });
  });
});
