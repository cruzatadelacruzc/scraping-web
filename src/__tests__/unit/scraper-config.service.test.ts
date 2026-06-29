import { ScraperConfigService } from '@scrapers/revolico/services/scraping/scraper-config.service';
import { ScraperConfigNotFoundError } from '@scrapers/revolico/errors/scraper-config-not-found.error';
import { ScraperConfigAlreadyExistsError } from '@scrapers/revolico/errors/scraper-config-already-exists.error';
import type {
  ScraperConfigRepository,
  ScraperConfigModel,
} from '@scrapers/revolico/services/scraping/repositories/scraper-config.repository';
import type { ScraperConfigRegistryService } from '@scrapers/revolico/services/scraping/scraper-config-registry.service';
import type { ILogger } from '@shared/logger.interface';

const makeModel = (overrides: Partial<ScraperConfigModel> = {}): ScraperConfigModel => ({
  id: 'cfg-1',
  storeKey: 'revolico:listing',
  expression: '$',
  version: 1,
  enabled: true,
  createdAt: new Date('2026-06-23T10:00:00.000Z'),
  updatedAt: new Date('2026-06-23T10:00:00.000Z'),
  ...overrides,
});

const buildRepoMock = (): jest.Mocked<ScraperConfigRepository> =>
  ({
    findByKey: jest.fn(),
    findEnabledByKey: jest.fn(),
    upsert: jest.fn(),
    findAll: jest.fn(),
  }) as unknown as jest.Mocked<ScraperConfigRepository>;

const buildRegistryMock = (): jest.Mocked<ScraperConfigRegistryService> =>
  ({
    get: jest.fn(),
    invalidate: jest.fn(),
  }) as unknown as jest.Mocked<ScraperConfigRegistryService>;

const buildLoggerMock = (): jest.Mocked<ILogger> =>
  ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }) as unknown as jest.Mocked<ILogger>;

describe('ScraperConfigService', () => {
  let repo: jest.Mocked<ScraperConfigRepository>;
  let registry: jest.Mocked<ScraperConfigRegistryService>;
  let log: jest.Mocked<ILogger>;
  let service: ScraperConfigService;

  beforeEach(() => {
    repo = buildRepoMock();
    registry = buildRegistryMock();
    log = buildLoggerMock();
    service = new ScraperConfigService(repo, registry, log);
  });

  describe('create', () => {
    it('persists a new config and invalidates the cache', async () => {
      repo.findByKey.mockResolvedValueOnce(null);
      repo.upsert.mockResolvedValueOnce(makeModel({ expression: '$.foo' }));

      const dto = await service.create('revolico:listing', '$.foo');

      expect(repo.findByKey).toHaveBeenCalledWith('revolico:listing');
      expect(repo.upsert).toHaveBeenCalledWith('revolico:listing', '$.foo');
      expect(registry.invalidate).toHaveBeenCalledWith('revolico:listing');
      expect(dto.storeKey).toBe('revolico:listing');
      expect(dto.expression).toBe('$.foo');
    });

    it('throws ScraperConfigAlreadyExistsError when the key is taken', async () => {
      repo.findByKey.mockResolvedValueOnce(makeModel());

      await expect(service.create('revolico:listing', '$.foo')).rejects.toBeInstanceOf(ScraperConfigAlreadyExistsError);
      expect(repo.upsert).not.toHaveBeenCalled();
      expect(registry.invalidate).not.toHaveBeenCalled();
    });

    it('propagates invalid-expression errors from the repo', async () => {
      repo.findByKey.mockResolvedValueOnce(null);
      repo.upsert.mockRejectedValueOnce(new Error('Invalid JSONata expression for storeKey="x": syntax error'));

      await expect(service.create('revolico:listing', ')(')).rejects.toThrow(/invalid jsonata/i);
      expect(registry.invalidate).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('returns mapped DTOs for every row', async () => {
      repo.findAll.mockResolvedValueOnce([
        makeModel({ storeKey: 'revolico:listing' }),
        makeModel({ storeKey: 'revolico:detail', id: 'cfg-2', enabled: false }),
      ]);

      const dtos = await service.list();

      expect(dtos).toHaveLength(2);
      expect(dtos[0].storeKey).toBe('revolico:listing');
      expect(dtos[1].storeKey).toBe('revolico:detail');
      expect(dtos[1].enabled).toBe(false);
    });

    it('returns an empty array when there are no rows', async () => {
      repo.findAll.mockResolvedValueOnce([]);
      await expect(service.list()).resolves.toEqual([]);
    });
  });

  describe('findOne', () => {
    it('returns the mapped DTO when the row exists', async () => {
      repo.findByKey.mockResolvedValueOnce(makeModel());

      const dto = await service.findOne('revolico:listing');

      expect(repo.findByKey).toHaveBeenCalledWith('revolico:listing');
      expect(dto.storeKey).toBe('revolico:listing');
    });

    it('throws ScraperConfigNotFoundError when the row is missing', async () => {
      repo.findByKey.mockResolvedValueOnce(null);

      await expect(service.findOne('revolico:missing')).rejects.toBeInstanceOf(ScraperConfigNotFoundError);
    });
  });

  describe('update', () => {
    it('persists the new expression and invalidates the cache', async () => {
      repo.findByKey.mockResolvedValueOnce(makeModel());
      repo.upsert.mockResolvedValueOnce(makeModel({ expression: '$.bar', version: 2 }));

      const dto = await service.update('revolico:listing', '$.bar');

      expect(repo.findByKey).toHaveBeenCalledWith('revolico:listing');
      expect(repo.upsert).toHaveBeenCalledWith('revolico:listing', '$.bar');
      expect(registry.invalidate).toHaveBeenCalledWith('revolico:listing');
      expect(dto.expression).toBe('$.bar');
    });

    it('throws ScraperConfigNotFoundError when the row is missing', async () => {
      repo.findByKey.mockResolvedValueOnce(null);

      await expect(service.update('revolico:missing', '$.foo')).rejects.toBeInstanceOf(ScraperConfigNotFoundError);
      expect(repo.upsert).not.toHaveBeenCalled();
      expect(registry.invalidate).not.toHaveBeenCalled();
    });
  });
});
