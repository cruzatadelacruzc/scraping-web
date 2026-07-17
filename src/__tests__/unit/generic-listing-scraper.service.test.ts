import { GenericListingScraperService } from '@scrapers/revolico/services/scraping/generic-listing-scraper.service';
import { ScrapingProductsType } from '@scrapers/revolico/services/dto';
import { JsonataExtractionError } from '@scrapers/revolico/errors/jsonata-extraction.error';
import type { IFetchProductData } from '@shared/fetch-product-data.interface';
import type { JsonataRunnerService } from '@scrapers/revolico/services/scraping/jsonata-runner.service';
import type { ScraperConfigRegistryService } from '@scrapers/revolico/services/scraping/scraper-config-registry.service';
import type { ScraperConfigModel } from '@scrapers/revolico/services/scraping/repositories/scraper-config.repository';
import type { IJobContext } from '@shared/queue/port/job-context.interfaces';
import type { ILogger } from '@shared/logger.interface';

const loggerStub: ILogger = {
  context: 'GenericListingScraperService',
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(),
};

interface IListingRow {
  url: string;
  description?: string;
  cost?: string;
  imageURL?: string;
  isOutstanding?: boolean;
}

const makeCtx = (data: ScrapingProductsType): IJobContext<ScrapingProductsType> => ({
  id: 'job-1',
  name: 'products_scraping',
  data,
  attemptsMade: 0,
  log: jest.fn().mockResolvedValue(undefined),
  progress: jest.fn().mockResolvedValue(undefined),
});

describe('GenericListingScraperService', () => {
  let revolicoData: jest.Mocked<Pick<IFetchProductData, 'fetchRenderedJson' | 'buildURL'>>;
  let runner: jest.Mocked<Pick<JsonataRunnerService, 'run'>>;
  let registry: jest.Mocked<Pick<ScraperConfigRegistryService, 'get'>>;
  let service: GenericListingScraperService;

  beforeEach(() => {
    revolicoData = {
      buildURL: jest.fn(),
      fetchRenderedJson: jest.fn(),
    } as jest.Mocked<Pick<IFetchProductData, 'fetchRenderedJson' | 'buildURL'>>;
    runner = {
      run: jest.fn(),
    } as jest.Mocked<Pick<JsonataRunnerService, 'run'>>;
    registry = {
      get: jest.fn(),
    } as jest.Mocked<Pick<ScraperConfigRegistryService, 'get'>>;

    service = new GenericListingScraperService(revolicoData as never, runner as never, registry as never, loggerStub);
  });

  const cfg = (overrides: Partial<ScraperConfigModel> = {}): ScraperConfigModel =>
    ({
      id: 'cfg-1',
      storeKey: 'revolico:listing',
      expression: '{ "products": $ }',
      version: 1,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as ScraperConfigModel;

  it('maps IListingRow rows from a single page into IRevolicoProduct with parsed cost + ID', async () => {
    registry.get.mockResolvedValueOnce(cfg());
    revolicoData.buildURL.mockReturnValue('https://www.revolico.com/search?category=inmuebles&page=1');
    const tree = [{ tag: 'li' }];
    revolicoData.fetchRenderedJson.mockResolvedValueOnce(tree);
    const rows: IListingRow[] = [
      {
        url: '/ad/tripp-lite-power-strip-12345',
        description: 'Like new',
        cost: '1500 USD',
        imageURL: 'https://img/1.jpg',
        isOutstanding: true,
      },
    ];
    runner.run.mockResolvedValueOnce({ products: rows, promoted: [] });

    const ctx = makeCtx({ category: 'inmuebles', subcategory: 'apartamentos', pageNumber: 1, totalPages: 1 });
    const result = await service.processor(ctx);

    expect(registry.get).toHaveBeenCalledWith('revolico:listing');
    expect(revolicoData.buildURL).toHaveBeenCalledWith('inmuebles', 'apartamentos', 1);
    expect(revolicoData.fetchRenderedJson).toHaveBeenCalledWith(
      'https://www.revolico.com/search?category=inmuebles&page=1',
      'div[class*="GridList__CardsContainer"]',
      ctx,
    );
    expect(runner.run).toHaveBeenCalledWith('{ "products": $ }', tree, { timeoutMs: 5000, storeKey: 'revolico:listing' });
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      ID: '12345',
      category: 'inmuebles',
      subcategory: 'apartamentos',
      url: 'https://www.revolico.com/ad/tripp-lite-power-strip-12345',
      cost: '1500 USD',
      currency: 'USD',
      price: 1500,
      description: 'Like new',
      imageURL: 'https://img/1.jpg',
      isOutstanding: true,
      isPromoted: false,
      metadata: expect.objectContaining({
        source: 'revolico',
        schemaVersion: 1,
      }),
      tags: [],
      attributes: {},
      analytics: {},
    });
  });

  it('skips rows missing required fields (cost, imageURL, ID)', async () => {
    registry.get.mockResolvedValueOnce(cfg());
    revolicoData.buildURL.mockReturnValue('u');
    revolicoData.fetchRenderedJson.mockResolvedValueOnce([{ tag: 'li' }]);
    runner.run.mockResolvedValueOnce({
      products: [
        { url: '/x-1', cost: '5 USD', imageURL: 'i' },
        { url: '/x-2', cost: '', imageURL: 'i' },
        { url: '/x-3', cost: '5 USD', imageURL: '' },
      ],
      promoted: [],
    });

    const result = await service.processor(makeCtx({ category: 'c', pageNumber: 1, totalPages: 1 }));
    expect(result).toHaveLength(1);
    expect(result[0].ID).toBe('1');
  });

  it('iterates over multiple pages when totalPages > 1', async () => {
    registry.get.mockResolvedValue(cfg());
    revolicoData.buildURL.mockImplementation((_c, _s, page) => `https://revolico/page-${page}`);
    revolicoData.fetchRenderedJson.mockResolvedValue([{ tag: 'li' }]);
    runner.run.mockResolvedValue({ products: [{ url: '/p-1', cost: '1 USD', imageURL: 'i' }], promoted: [] });

    await service.processor(makeCtx({ category: 'c', pageNumber: 1, totalPages: 3 }));
    expect(revolicoData.fetchRenderedJson).toHaveBeenCalledTimes(3);
    expect(revolicoData.fetchRenderedJson).toHaveBeenNthCalledWith(
      1,
      'https://revolico/page-1',
      'div[class*="GridList__CardsContainer"]',
      expect.anything(),
    );
    expect(revolicoData.fetchRenderedJson).toHaveBeenNthCalledWith(
      2,
      'https://revolico/page-2',
      'div[class*="GridList__CardsContainer"]',
      expect.anything(),
    );
    expect(revolicoData.fetchRenderedJson).toHaveBeenNthCalledWith(
      3,
      'https://revolico/page-3',
      'div[class*="GridList__CardsContainer"]',
      expect.anything(),
    );
  });

  it('re-throws JsonataExtractionError after logging diagnostics via ctx.log and _log.error', async () => {
    registry.get.mockResolvedValueOnce(cfg());
    revolicoData.buildURL.mockReturnValue('u');
    revolicoData.fetchRenderedJson.mockResolvedValueOnce([{ tag: 'li' }]);
    const err = new JsonataExtractionError({
      code: 'EXPRESSION_ERROR',
      message: 'Jsonata EXPRESSION_ERROR at storeKey=revolico:listing | Path: $.products | JSONata: oops',
      expression: '{ "products": $ }',
      inputJson: { tag: 'li' },
    });
    runner.run.mockRejectedValueOnce(err);

    const ctx = makeCtx({ category: 'c', pageNumber: 1, totalPages: 1 });
    await expect(service.processor(ctx)).rejects.toBe(err);

    // ctx.log entries — visible in Bull-Board's LOGS tab for the failed job.
    expect(ctx.log).toHaveBeenCalledWith(expect.stringMatching(/\[scraper-failure\] errName=JsonataExtractionError/));
    expect(ctx.log).toHaveBeenCalledWith(expect.stringMatching(/\[scraper-failure\] message=.*EXPRESSION_ERROR/));
    expect(ctx.log).toHaveBeenCalledWith(expect.stringMatching(/\[scraper-failure\] stack=/));
    expect(ctx.log).toHaveBeenCalledWith(expect.stringMatching(/\[scraper-failure\] code=EXPRESSION_ERROR storeKey=revolico:listing/));
    expect(ctx.log).toHaveBeenCalledWith(expect.stringContaining('expression:'));
    expect(ctx.log).toHaveBeenCalledWith(expect.stringMatching(/input-json/));

    // _log.error — visible in stdout / file logs.
    expect(loggerStub.error).toHaveBeenCalledWith(
      expect.stringContaining('[revolico] listing scraper failed'),
      expect.objectContaining({
        jobId: ctx.id,
        storeKey: 'revolico:listing',
        errName: 'JsonataExtractionError',
        errMessage: expect.stringContaining('EXPRESSION_ERROR'),
      }),
    );
  });

  it('throws when registry.get reports CONFIG_MISSING (no DB row)', async () => {
    const err = new JsonataExtractionError({
      code: 'CONFIG_MISSING',
      message: 'ScraperConfig not found for storeKey=revolico:listing',
    });
    registry.get.mockRejectedValueOnce(err);

    await expect(service.processor(makeCtx({ category: 'c', pageNumber: 1, totalPages: 1 }))).rejects.toBe(err);
  });

  it('logs URL at info level before fetching each listing page', async () => {
    registry.get.mockResolvedValue(cfg());
    revolicoData.buildURL.mockImplementation((_c, _s, page) => `https://revolico/page-${page}`);
    revolicoData.fetchRenderedJson.mockResolvedValue([{ tag: 'li' }]);
    runner.run.mockResolvedValue({ products: [{ url: '/p-1', cost: '1 USD', imageURL: 'i' }], promoted: [] });

    await service.processor(makeCtx({ category: 'c', pageNumber: 1, totalPages: 2 }));

    expect(loggerStub.info).toHaveBeenCalledWith(
      expect.stringMatching(/\[revolico\] fetching listing page 1\/2: https:\/\/revolico\/page-1/),
    );
    expect(loggerStub.info).toHaveBeenCalledWith(
      expect.stringMatching(/\[revolico\] fetching listing page 2\/2: https:\/\/revolico\/page-2/),
    );
  });

  it('throws JsonataExtractionError(EMPTY_TREE) and warns when fetchRenderedJson returns an empty array', async () => {
    registry.get.mockResolvedValueOnce(cfg());
    revolicoData.buildURL.mockReturnValue('https://revolico/x');
    revolicoData.fetchRenderedJson.mockResolvedValueOnce([]);

    const ctx = makeCtx({ category: 'c', pageNumber: 1, totalPages: 1 });
    await expect(service.processor(ctx)).rejects.toMatchObject({
      name: 'JsonataExtractionError',
      code: 'EMPTY_TREE',
    });

    expect(loggerStub.warn).toHaveBeenCalledWith(
      expect.stringContaining('[revolico] empty DOM tree'),
      expect.objectContaining({
        url: 'https://revolico/x',
        selector: 'div[class*="GridList__CardsContainer"]',
        storeKey: 'revolico:listing',
      }),
    );
    expect(ctx.log).toHaveBeenCalledWith(expect.stringMatching(/\[scraper-failure\] empty DOM tree at https:\/\/revolico\/x/));
  });

  it('throws JsonataExtractionError(NO_PRODUCTS_EXTRACTED) and warns when JSONata returns 0 products against a non-empty tree', async () => {
    registry.get.mockResolvedValueOnce(cfg());
    revolicoData.buildURL.mockReturnValue('https://revolico/x');
    revolicoData.fetchRenderedJson.mockResolvedValueOnce([{ tag: 'li' }, { tag: 'li' }]);
    runner.run.mockResolvedValueOnce({ products: [], promoted: [] });

    const ctx = makeCtx({ category: 'c', pageNumber: 1, totalPages: 1 });
    await expect(service.processor(ctx)).rejects.toMatchObject({
      name: 'JsonataExtractionError',
      code: 'NO_PRODUCTS_EXTRACTED',
    });

    expect(loggerStub.warn).toHaveBeenCalledWith(
      expect.stringContaining('[revolico] JSONata expression extracted 0 products'),
      expect.objectContaining({
        url: 'https://revolico/x',
        treeLength: 2,
        storeKey: 'revolico:listing',
      }),
    );
    expect(ctx.log).toHaveBeenCalledWith(expect.stringMatching(/\[scraper-failure\] no products extracted at https:\/\/revolico\/x/));
  });
});
