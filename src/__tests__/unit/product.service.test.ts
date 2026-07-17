import { ProductService } from '@scrapers/revolico/services/product.service';
import { ProductRepository } from '@scrapers/revolico/repositories/product.repository';
import { AnalyticsService, IProductAnalytics } from '@scrapers/revolico/services/analytics.service';
import { AttributeExtractorService } from '@scrapers/services/attribute-extractor/attribute-extractor.service';
import { EnrichmentMetricsService } from '@scrapers/services/enrichment-metrics.service';
import { ILogger } from '@shared/logger.interface';
import crypto from 'crypto';

// The enrichProduct guard relies on _hashDescription (private). We test it
// indirectly through enrichProduct by checking whether the extractor is called.

function makeLogger(): ILogger {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as ILogger;
}

function makeAnalytics(overrides: Partial<IProductAnalytics> = {}): IProductAnalytics {
  return {
    viewsPerDay: 0,
    priceTrend: 'stable',
    priceVolatility: 0,
    priceChanges: 0,
    hotScore: 0,
    computedAt: new Date().toISOString(),
    ...overrides,
  };
}

// Helper: build a minimal product stub matching IRevolicoProduct
function makeProduct(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    _id: '507f1f77bcf86cd799439011',
    url: 'https://example.com/product/1',
    ID: '123',
    price: 100,
    currency: 'USD',
    description: 'iPhone 14 Pro Max 256GB negro como nuevo',
    isOutstanding: false,
    views: 50,
    category: 'celulares',
    subcategory: 'iphone',
    location: { state: 'La Habana', municipality: 'Plaza' },
    seller: { name: 'Juan' },
    priceHistory: [{ value: 100, updatedAt: new Date() }],
    viewsHistory: [{ value: 50, updatedAt: new Date() }],
    isOutstandingHistory: [{ value: false, updatedAt: new Date() }],
    locationHistory: [{ value: { state: 'La Habana', municipality: 'Plaza' }, updatedAt: new Date() }],
    enrichmentHash: undefined,
    attributes: {},
    analytics: undefined,
    metadata: { source: 'revolico' },
    tags: [],
    ...overrides,
  };
}

describe('ProductService.enrichProduct — enrichmentHash guard', () => {
  let repoMock: jest.Mocked<ProductRepository>;
  let analyticsMock: jest.Mocked<AnalyticsService>;
  let extractorMock: jest.Mocked<AttributeExtractorService>;
  let service: ProductService;

  beforeEach(() => {
    repoMock = {
      findOne: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<ProductRepository>;

    analyticsMock = {
      compute: jest.fn().mockReturnValue(null),
    } as unknown as jest.Mocked<AnalyticsService>;

    extractorMock = {
      extract: jest.fn().mockResolvedValue({}),
    } as unknown as jest.Mocked<AttributeExtractorService>;

    const metricsMock = {
      recordEnrichment: jest.fn(),
      recordEnrichmentHashSkip: jest.fn(),
    } as unknown as EnrichmentMetricsService;

    service = new ProductService(
      makeLogger(),
      {} as any, // QueueContext — unused in enrichProduct
      repoMock as ProductRepository,
      {} as any, // ScrapingProductService — unused
      {} as any, // AlarmEngineService — unused
      analyticsMock as AnalyticsService,
      extractorMock,
      metricsMock,
    );
  });

  // ---- Guard: skips when hash matches ----

  it('skips attribute extraction when enrichmentHash matches current description', async () => {
    const description = 'iPhone 14 Pro Max 256GB negro como nuevo';
    const hash = crypto.createHash('md5').update(description.trim().toLowerCase()).digest('hex');
    const product = makeProduct({
      description,
      enrichmentHash: hash,
      attributes: { keywords: ['iphone', '14 pro max', '256gb'] },
    });

    repoMock.findOne.mockResolvedValue(product as any);
    analyticsMock.compute.mockReturnValue(makeAnalytics({ viewsPerDay: 5, hotScore: 10 }));

    await service.enrichProduct(product.url as string);

    expect(extractorMock.extract).not.toHaveBeenCalled();
    expect(analyticsMock.compute).toHaveBeenCalledTimes(1);
    // enrichmentHash is always written
    expect(repoMock.update).toHaveBeenCalledWith(product._id, expect.objectContaining({ enrichmentHash: hash }));
  });

  // ---- Extracts when no hash ----

  it('calls attribute extractor when product has no enrichmentHash (first scrape)', async () => {
    const description = 'Samsung Galaxy S24 ultra nuevo';
    const product = makeProduct({
      description,
      enrichmentHash: undefined,
      attributes: {},
    });

    repoMock.findOne.mockResolvedValue(product as any);
    analyticsMock.compute.mockReturnValue(makeAnalytics({ viewsPerDay: 2 }));
    extractorMock.extract.mockResolvedValue({ keywords: ['samsung', 'galaxy s24'] });

    await service.enrichProduct(product.url as string);

    expect(extractorMock.extract).toHaveBeenCalledWith(description);
    expect(repoMock.update).toHaveBeenCalled();
  });

  // ---- Extracts when hash differs ----

  it('calls attribute extractor when description changed (hash mismatch)', async () => {
    const oldDescription = 'iPhone 14 viejo';
    const oldHash = crypto.createHash('md5').update(oldDescription.trim().toLowerCase()).digest('hex');
    const newDescription = 'iPhone 15 Pro nuevo';
    const newHash = crypto.createHash('md5').update(newDescription.trim().toLowerCase()).digest('hex');

    const product = makeProduct({
      description: newDescription,
      enrichmentHash: oldHash,
      attributes: { keywords: ['iphone', '14'] },
    });

    repoMock.findOne.mockResolvedValue(product as any);
    extractorMock.extract.mockResolvedValue({ keywords: ['iphone', '15 pro'] });

    await service.enrichProduct(product.url as string);

    expect(extractorMock.extract).toHaveBeenCalledWith(newDescription);
    // Should store the NEW hash
    expect(repoMock.update).toHaveBeenCalledWith(product._id, expect.objectContaining({ enrichmentHash: newHash }));
  });

  // ---- Always computes analytics ----

  it('always computes analytics even when skipping extraction', async () => {
    const description = 'Casa en Miramar 3 cuartos';
    const hash = crypto.createHash('md5').update(description.trim().toLowerCase()).digest('hex');
    const product = makeProduct({
      description,
      enrichmentHash: hash,
      attributes: { keywords: ['casa', 'miramar'] },
    });

    repoMock.findOne.mockResolvedValue(product as any);
    analyticsMock.compute.mockReturnValue(makeAnalytics({ viewsPerDay: 10, priceTrend: 'stable' }));

    await service.enrichProduct(product.url as string);

    expect(analyticsMock.compute).toHaveBeenCalledTimes(1);
    expect(extractorMock.extract).not.toHaveBeenCalled();
    expect(repoMock.update).toHaveBeenCalledWith(
      product._id,
      expect.objectContaining({ analytics: expect.objectContaining({ viewsPerDay: 10, priceTrend: 'stable' }) }),
    );
  });

  // ---- Guard: empty description ----

  it('does not skip extraction when description is empty (hash is empty string)', async () => {
    const product = makeProduct({
      description: '',
      enrichmentHash: '',
      attributes: {},
    });

    repoMock.findOne.mockResolvedValue(product as any);
    extractorMock.extract.mockResolvedValue({});

    await service.enrichProduct(product.url as string);

    // Empty description → hash is '' → guard skipped → extractor called
    expect(extractorMock.extract).toHaveBeenCalledWith('');
  });

  // ---- Guard: product not found ----

  it('returns early when product is not found', async () => {
    repoMock.findOne.mockResolvedValue(null);

    await service.enrichProduct('https://nonexistent.com/product');

    expect(extractorMock.extract).not.toHaveBeenCalled();
    expect(repoMock.update).not.toHaveBeenCalled();
  });

  // ---- Survives extractor failure ----

  it('logs error and does not throw when extractor throws', async () => {
    const product = makeProduct({ enrichmentHash: undefined, attributes: {} });
    repoMock.findOne.mockResolvedValue(product as any);
    extractorMock.extract.mockRejectedValue(new Error('LLM timeout'));

    await expect(service.enrichProduct(product.url as string)).resolves.toBeUndefined();
  });
});
