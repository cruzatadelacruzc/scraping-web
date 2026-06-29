import { GenericDetailScraperService, type IDetailRow } from '@scrapers/revolico/services/scraping/generic-detail-scraper.service';
import { JsonataExtractionError } from '@scrapers/revolico/errors/jsonata-extraction.error';
import type { IFetchProductData } from '@shared/fetch-product-data.interface';
import type { JsonataRunnerService } from '@scrapers/revolico/services/scraping/jsonata-runner.service';
import type { ScraperConfigRegistryService } from '@scrapers/revolico/services/scraping/scraper-config-registry.service';
import type { ScraperConfigModel } from '@scrapers/revolico/services/scraping/repositories/scraper-config.repository';
import type { ProductRepository } from '@scrapers/revolico/repositories/product.repository';
import type { IJobContext } from '@shared/queue/port/job-context.interfaces';
import type { ILogger } from '@shared/logger.interface';
import type { IRevolicoProduct } from '@scrapers/revolico/models/product.model';

jest.mock('@utils/puppeteer.utils', () => ({
  __esModule: true,
  delayRandom: jest.fn().mockResolvedValue(undefined),
  CONFIG: { headless: true, args: [] },
  TIME_OUT: 30000,
  VIEW_PORT: { width: 1280, height: 800 },
}));

const loggerStub: ILogger = {
  context: 'GenericDetailScraperService',
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(),
};

const makeCtx = (data: { url: string }[]): IJobContext<{ url: string }[]> => ({
  id: 'job-1',
  name: 'product_scraping',
  data,
  attemptsMade: 0,
  log: jest.fn().mockResolvedValue(undefined),
  progress: jest.fn().mockResolvedValue(undefined),
});

const cfg = (overrides: Partial<ScraperConfigModel> = {}): ScraperConfigModel =>
  ({
    id: 'cfg-2',
    storeKey: 'revolico:detail',
    expression: '{ "views": "0", "location": "", "seller": {} }',
    version: 1,
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as ScraperConfigModel;

describe('GenericDetailScraperService', () => {
  let revolicoData: jest.Mocked<Pick<IFetchProductData, 'fetchRenderedJson'>>;
  let runner: jest.Mocked<Pick<JsonataRunnerService, 'run'>>;
  let registry: jest.Mocked<Pick<ScraperConfigRegistryService, 'get'>>;
  let repo: jest.Mocked<Pick<ProductRepository, 'findOne' | 'update'>>;
  let service: GenericDetailScraperService;

  beforeEach(() => {
    revolicoData = { fetchRenderedJson: jest.fn() } as jest.Mocked<Pick<IFetchProductData, 'fetchRenderedJson'>>;
    runner = { run: jest.fn() } as jest.Mocked<Pick<JsonataRunnerService, 'run'>>;
    registry = { get: jest.fn() } as jest.Mocked<Pick<ScraperConfigRegistryService, 'get'>>;
    repo = {
      findOne: jest.fn(),
      update: jest.fn(),
    } as jest.Mocked<Pick<ProductRepository, 'findOne' | 'update'>>;

    service = new GenericDetailScraperService(revolicoData as never, runner as never, registry as never, repo as never, loggerStub);
  });

  it('fetches the detail JSONata config, evaluates the DOM tree, and updates the matching product', async () => {
    registry.get.mockResolvedValueOnce(cfg());
    revolicoData.fetchRenderedJson.mockResolvedValueOnce({ tag: 'main' });
    const row: IDetailRow = {
      views: '153',
      location: 'Plaza de la Revolución / La Habana',
      seller: { name: 'Maria', whatsapp: '5355512345', phone: '55512345', email: 'm@x.cu' },
    };
    runner.run.mockResolvedValueOnce(row);
    repo.findOne.mockResolvedValueOnce({ _id: 'p1' } as unknown as IRevolicoProduct);
    repo.update.mockResolvedValueOnce({ _id: 'p1' } as unknown as IRevolicoProduct);

    const ctx = makeCtx([{ url: 'https://www.revolico.com/ad/x-1' }]);
    const result = await service.processor(ctx);

    expect(registry.get).toHaveBeenCalledWith('revolico:detail');
    expect(revolicoData.fetchRenderedJson).toHaveBeenCalledWith('https://www.revolico.com/ad/x-1', 'main', ctx);
    expect(runner.run).toHaveBeenCalledWith(cfg().expression, { tag: 'main' }, { timeoutMs: 5000, storeKey: 'revolico:detail' });
    expect(repo.findOne).toHaveBeenCalledWith({ url: 'https://www.revolico.com/ad/x-1' }, { _id: 1 });
    expect(repo.update).toHaveBeenCalledWith('p1', {
      views: 153,
      location: { state: 'La Habana', municipality: 'Plaza de la Revolución' },
      seller: { name: 'Maria', whatsapp: '5355512345', phone: '55512345', email: 'm@x.cu' },
    });
    expect(result).toBe('Processed 1 product URLs');
  });

  it('skips the URL when the product is not found in Mongo', async () => {
    registry.get.mockResolvedValueOnce(cfg());
    revolicoData.fetchRenderedJson.mockResolvedValueOnce({ tag: 'main' });
    runner.run.mockResolvedValueOnce({ views: '0', location: '', seller: { name: '', whatsapp: '', phone: '', email: '' } });
    repo.findOne.mockResolvedValueOnce(null);

    const result = await service.processor(makeCtx([{ url: 'https://x.example/ad/missing-9' }]));
    expect(repo.update).not.toHaveBeenCalled();
    expect(result).toBe('Processed 1 product URLs');
  });

  it('processes multiple URLs sequentially', async () => {
    registry.get.mockResolvedValue(cfg());
    revolicoData.fetchRenderedJson.mockResolvedValue({ tag: 'main' });
    runner.run.mockResolvedValue({ views: '10', location: '', seller: { name: '', whatsapp: '', phone: '', email: '' } });
    repo.findOne.mockImplementation(async filter => ({ _id: (filter as { url?: string }).url }) as unknown as IRevolicoProduct);
    repo.update.mockResolvedValue({} as IRevolicoProduct);

    const urls = [{ url: 'https://x/a-1' }, { url: 'https://x/a-2' }, { url: 'https://x/a-3' }];
    const result = await service.processor(makeCtx(urls));
    expect(repo.update).toHaveBeenCalledTimes(3);
    expect(result).toBe('Processed 3 product URLs');
  });

  it('logs scraper-failure diagnostics and re-throws on JsonataExtractionError', async () => {
    registry.get.mockResolvedValueOnce(cfg());
    repo.findOne.mockResolvedValueOnce({ _id: 'p1' } as unknown as IRevolicoProduct);
    revolicoData.fetchRenderedJson.mockResolvedValueOnce({ tag: 'main' });
    const err = new JsonataExtractionError({
      code: 'EXPRESSION_ERROR',
      message: 'Jsonata EXPRESSION_ERROR at storeKey=revolico:detail | Path: $.seller | JSONata: oops',
      expression: cfg().expression,
      inputJson: { tag: 'main' },
    });
    runner.run.mockRejectedValueOnce(err);

    const ctx = makeCtx([{ url: 'https://x/a-1' }]);
    await expect(service.processor(ctx)).rejects.toBe(err);

    // ctx.log entries — visible in Bull-Board's LOGS tab for the failed job.
    expect(ctx.log).toHaveBeenCalledWith(expect.stringMatching(/\[scraper-failure\] errName=JsonataExtractionError/));
    expect(ctx.log).toHaveBeenCalledWith(expect.stringMatching(/\[scraper-failure\] message=.*EXPRESSION_ERROR/));
    expect(ctx.log).toHaveBeenCalledWith(expect.stringMatching(/\[scraper-failure\] stack=/));
    expect(ctx.log).toHaveBeenCalledWith(expect.stringMatching(/\[scraper-failure\] code=EXPRESSION_ERROR storeKey=revolico:detail/));
    expect(ctx.log).toHaveBeenCalledWith(expect.stringContaining('expression:'));
    expect(ctx.log).toHaveBeenCalledWith(expect.stringMatching(/input-json/));

    // _log.error — visible in stdout / file logs.
    expect(loggerStub.error).toHaveBeenCalledWith(
      expect.stringContaining('[revolico] detail scraper failed'),
      expect.objectContaining({
        jobId: ctx.id,
        url: 'https://x/a-1',
        storeKey: 'revolico:detail',
        errName: 'JsonataExtractionError',
        errMessage: expect.stringContaining('EXPRESSION_ERROR'),
      }),
    );
  });

  it('logs URL at info level before fetching each detail page', async () => {
    registry.get.mockResolvedValue(cfg());
    revolicoData.fetchRenderedJson.mockResolvedValue({ tag: 'main' });
    runner.run.mockResolvedValue({ views: '0', location: '', seller: { name: '', whatsapp: '', phone: '', email: '' } });
    repo.findOne.mockImplementation(async filter => ({ _id: (filter as { url?: string }).url }) as unknown as IRevolicoProduct);
    repo.update.mockResolvedValue({} as IRevolicoProduct);

    const urls = [{ url: 'https://x/a-1' }, { url: 'https://x/a-2' }];
    await service.processor(makeCtx(urls));

    expect(loggerStub.info).toHaveBeenCalledWith(expect.stringMatching(/\[revolico\] fetching detail: https:\/\/x\/a-1/));
    expect(loggerStub.info).toHaveBeenCalledWith(expect.stringMatching(/\[revolico\] fetching detail: https:\/\/x\/a-2/));
  });

  it('throws JsonataExtractionError(EMPTY_TREE) and warns when fetchRenderedJson returns an empty array', async () => {
    registry.get.mockResolvedValueOnce(cfg());
    repo.findOne.mockResolvedValueOnce({ _id: 'p1' } as unknown as IRevolicoProduct);
    revolicoData.fetchRenderedJson.mockResolvedValueOnce([]);

    const ctx = makeCtx([{ url: 'https://x/a-1' }]);
    await expect(service.processor(ctx)).rejects.toMatchObject({
      name: 'JsonataExtractionError',
      code: 'EMPTY_TREE',
    });

    expect(loggerStub.warn).toHaveBeenCalledWith(
      expect.stringContaining('[revolico] empty DOM tree'),
      expect.objectContaining({
        url: 'https://x/a-1',
        selector: 'main',
        storeKey: 'revolico:detail',
      }),
    );
    expect(ctx.log).toHaveBeenCalledWith(expect.stringMatching(/\[scraper-failure\] empty DOM tree at https:\/\/x\/a-1/));
  });
});
