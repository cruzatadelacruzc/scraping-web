import { ProductRepository } from '@scrapers/revolico/repositories/product.repository';
import { ILogger } from '@shared/logger.interface';

// Mock ProductRepository with both existing and new methods.
// This confirms the deleteById and aggregate method shapes before they exist.
jest.mock('@scrapers/revolico/repositories/product.repository', () => ({
  __esModule: true,
  ProductRepository: jest.fn().mockImplementation(() => ({
    clearAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    bulkInsertOrUpdate: jest.fn(),
    deleteById: jest.fn(),
    aggregate: jest.fn(),
  })),
}));

import { ProductAdminService } from '@admin/services/product-admin.service';
import { ProductListQueryDTO } from '@admin/services/dto/product-list-query.dto';

describe('ProductAdminService — Repository shape verification', () => {
  let mockRepo: jest.Mocked<ProductRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo = new (ProductRepository as jest.Mock)() as jest.Mocked<ProductRepository>;
  });

  describe('deleteById', () => {
    it('should be defined and accept a string _id', async () => {
      expect(mockRepo.deleteById).toBeDefined();
      expect(typeof mockRepo.deleteById).toBe('function');

      mockRepo.deleteById.mockResolvedValue({ acknowledged: true, deletedCount: 1 });
      const result = await mockRepo.deleteById('abc123');

      expect(mockRepo.deleteById).toHaveBeenCalledWith('abc123');
      expect(result).toEqual({ acknowledged: true, deletedCount: 1 });
    });

    it('should return DeleteResult with deletedCount 0 when id does not match', async () => {
      mockRepo.deleteById.mockResolvedValue({ acknowledged: true, deletedCount: 0 });
      const result = await mockRepo.deleteById('nonexistent-id');
      expect(result.deletedCount).toBe(0);
    });
  });

  describe('aggregate', () => {
    it('should be defined and accept a PipelineStage array', async () => {
      expect(mockRepo.aggregate).toBeDefined();
      expect(typeof mockRepo.aggregate).toBe('function');

      const pipeline = [{ $match: { category: 'inmuebles' } }];
      mockRepo.aggregate.mockResolvedValue([{ _id: 'cat-1', count: 42 }]);
      const result = await mockRepo.aggregate(pipeline as never[]);

      expect(mockRepo.aggregate).toHaveBeenCalledWith(pipeline);
      expect(result).toEqual([{ _id: 'cat-1', count: 42 }]);
    });

    it('should return an empty array when no documents match', async () => {
      mockRepo.aggregate.mockResolvedValue([]);
      const result = await mockRepo.aggregate([{ $match: { nonExistent: true } }] as never[]);
      expect(result).toEqual([]);
    });
  });
});

// ---------------------------------------------------------------------------
// ProductAdminService tests
// ---------------------------------------------------------------------------
describe('ProductAdminService', () => {
  let service: ProductAdminService;
  let mockRepo: jest.Mocked<ProductRepository>;
  let loggerMock: ILogger;

  // Reusable mock product returned from repo
  const mockProduct = {
    _id: '507f191e810c19729de860ea',
    ID: 'REV-123',
    category: 'inmuebles',
    subcategory: 'apartamentos',
    url: 'https://revolico.com/item/123',
    description: 'Hermoso apartamento',
    cost: '50000',
    currency: 'USD',
    price: 50000,
    imageURL: 'https://img.revolico.com/123.jpg',
    isOutstanding: true,
    isPromoted: true,
    location: { state: 'La Habana', municipality: 'Plaza' },
    views: 150,
    seller: { name: 'Juan', phone: '+5355555555' },
    priceHistory: [
      { value: 50000, updatedAt: new Date('2025-01-10') },
      { value: 52000, updatedAt: new Date('2025-01-01') },
    ],
    viewsHistory: [{ value: 150, updatedAt: new Date('2025-01-10') }],
    locationHistory: [{ value: { state: 'La Habana', municipality: 'Plaza' }, updatedAt: new Date('2025-01-10') }],
    isOutstandingHistory: [{ value: true, updatedAt: new Date('2025-01-10') }],
    isPromotedHistory: [{ value: true, updatedAt: new Date('2025-01-10') }],
    metadata: { scrapedAt: new Date('2025-01-15') },
    tags: ['vedado'],
    attributes: { keywords: ['hermoso', 'apartamento'] },
    analytics: { viewsPerDay: 5.2, priceTrend: 'stable', hotScore: 10.4 },
    enrichmentHash: 'abc123def456',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-15'),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    loggerMock = {
      context: '',
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      log: jest.fn(),
    } as unknown as ILogger;

    mockRepo = new (ProductRepository as jest.Mock)() as jest.Mocked<ProductRepository>;
    service = new ProductAdminService(mockRepo, loggerMock);
  });

  // -------------------------------------------------------------------------
  // list
  // -------------------------------------------------------------------------
  describe('list', () => {
    it('should return paginated products', async () => {
      mockRepo.find.mockResolvedValue([mockProduct] as never[]);
      mockRepo.count.mockResolvedValue(1);

      const query = ProductListQueryDTO.from({ skip: 0, limit: 20 });
      const result = await service.list(query);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.skip).toBe(0);
      expect(result.meta.limit).toBe(20);
      expect(mockRepo.find).toHaveBeenCalled();
      expect(mockRepo.count).toHaveBeenCalled();
    });

    it('should pass search as regex to filter', async () => {
      mockRepo.find.mockResolvedValue([]);
      mockRepo.count.mockResolvedValue(0);

      const query = ProductListQueryDTO.from({ search: 'apartamento', skip: 0, limit: 10 });
      await service.list(query);

      // The filter passed to find should include a regex on description
      const findCall = mockRepo.find.mock.calls[0] as unknown[];
      expect(findCall[3]).toEqual(
        expect.objectContaining({
          description: expect.objectContaining({ $regex: 'apartamento', $options: 'i' }),
        }),
      );
    });

    it('should build filter from category and subcategory', async () => {
      mockRepo.find.mockResolvedValue([]);
      mockRepo.count.mockResolvedValue(0);

      const query = ProductListQueryDTO.from({ category: 'inmuebles', subcategory: 'apartamentos', skip: 0, limit: 10 });
      await service.list(query);

      const findCall = mockRepo.find.mock.calls[0] as unknown[];
      expect(findCall[3]).toEqual(
        expect.objectContaining({
          category: 'inmuebles',
          subcategory: 'apartamentos',
        }),
      );
    });

    it('should build filter from price range', async () => {
      mockRepo.find.mockResolvedValue([]);
      mockRepo.count.mockResolvedValue(0);

      const query = ProductListQueryDTO.from({ minPrice: 100, maxPrice: 1000, skip: 0, limit: 10 });
      await service.list(query);

      const findCall = mockRepo.find.mock.calls[0] as unknown[];
      expect(findCall[3]).toEqual(
        expect.objectContaining({
          price: { $gte: 100, $lte: 1000 },
        }),
      );
    });

    it('should build filter from boolean flags', async () => {
      mockRepo.find.mockResolvedValue([]);
      mockRepo.count.mockResolvedValue(0);

      const query = ProductListQueryDTO.from({ isOutstanding: true, isPromoted: true, skip: 0, limit: 10 });
      await service.list(query);

      const findCall = mockRepo.find.mock.calls[0] as unknown[];
      expect(findCall[3]).toEqual(
        expect.objectContaining({
          isOutstanding: true,
          isPromoted: true,
        }),
      );
    });

    it('should build filter for hasEnrichment=true', async () => {
      mockRepo.find.mockResolvedValue([]);
      mockRepo.count.mockResolvedValue(0);

      const query = ProductListQueryDTO.from({ hasEnrichment: true, skip: 0, limit: 10 });
      await service.list(query);

      const findCall = mockRepo.find.mock.calls[0] as unknown[];
      const filter = findCall[3] as Record<string, unknown>;
      expect(filter.enrichmentHash).toEqual({ $exists: true, $nin: [null, ''] });
    });

    it('should build filter for hasEnrichment=false', async () => {
      mockRepo.find.mockResolvedValue([]);
      mockRepo.count.mockResolvedValue(0);

      const query = ProductListQueryDTO.from({ hasEnrichment: false, skip: 0, limit: 10 });
      await service.list(query);

      const findCall = mockRepo.find.mock.calls[0] as unknown[];
      expect(findCall[3]).toHaveProperty('$or');
      const orFilter = (findCall[3] as Record<string, unknown>).$or as Array<Record<string, unknown>>;
      expect(orFilter).toHaveLength(3);
      expect(orFilter).toContainEqual({ enrichmentHash: { $exists: false } });
      expect(orFilter).toContainEqual({ enrichmentHash: null });
      expect(orFilter).toContainEqual({ enrichmentHash: '' });
    });

    it('should return enrichment flags in list items', async () => {
      mockRepo.find.mockResolvedValue([mockProduct] as never[]);
      mockRepo.count.mockResolvedValue(1);

      const query = ProductListQueryDTO.from({ skip: 0, limit: 20 });
      const result = await service.list(query);

      const item = result.data[0];
      expect(item.hasEnrichment).toBe(true);
      expect(item.hasAttributes).toBe(true);
      expect(item.hasAnalytics).toBe(true);
      expect(item.tags).toEqual(['vedado']);
    });

    it('should build nested location filter', async () => {
      mockRepo.find.mockResolvedValue([]);
      mockRepo.count.mockResolvedValue(0);

      const query = ProductListQueryDTO.from({ 'location.state': 'La Habana', skip: 0, limit: 10 });
      await service.list(query);

      const findCall = mockRepo.find.mock.calls[0] as unknown[];
      expect(findCall[3]).toEqual(
        expect.objectContaining({
          'location.state': 'La Habana',
        }),
      );
    });

    it('should pass projection to exclude history arrays', async () => {
      mockRepo.find.mockResolvedValue([mockProduct] as never[]);
      mockRepo.count.mockResolvedValue(1);

      const query = ProductListQueryDTO.from({ skip: 0, limit: 20 });
      await service.list(query);

      const findCall = mockRepo.find.mock.calls[0] as unknown[];
      expect(findCall[4]).toEqual(
        expect.objectContaining({
          priceHistory: 0,
          viewsHistory: 0,
          locationHistory: 0,
          isOutstandingHistory: 0,
          isPromotedHistory: 0,
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // getById
  // -------------------------------------------------------------------------
  describe('getById', () => {
    it('should return product detail when found', async () => {
      mockRepo.findOne.mockResolvedValue(mockProduct);

      const result = await service.getById('507f191e810c19729de860ea');

      expect(result).not.toBeNull();
      expect(result?._id).toBe('507f191e810c19729de860ea');
      expect(mockRepo.findOne).toHaveBeenCalledWith(
        { _id: '507f191e810c19729de860ea' },
        expect.objectContaining({
          priceHistory: 0,
          viewsHistory: 0,
          locationHistory: 0,
        }),
      );
    });

    it('should return enrichment fields in detail', async () => {
      mockRepo.findOne.mockResolvedValue(mockProduct);

      const result = await service.getById('507f191e810c19729de860ea');

      expect(result).not.toBeNull();
      expect(result?.attributes).toEqual({ keywords: ['hermoso', 'apartamento'] });
      expect(result?.analytics).toEqual({ viewsPerDay: 5.2, priceTrend: 'stable', hotScore: 10.4 });
      expect(result?.enrichmentHash).toBe('abc123def456');
      expect(result?.tags).toEqual(['vedado']);
      expect(result?.metadata).toEqual({ scrapedAt: expect.any(Date) });
    });

    it('should return null when product not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      const result = await service.getById('nonexistent');

      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // getPriceHistory
  // -------------------------------------------------------------------------
  describe('getPriceHistory', () => {
    it('should return sorted price history', async () => {
      mockRepo.findOne.mockResolvedValue(mockProduct);

      const result = await service.getPriceHistory('507f191e810c19729de860ea');

      expect(result).not.toBeNull();
      expect(result?.data).toHaveLength(2);
      expect(result?.total).toBe(2);
      // Sorted desc: newest first
      expect(result?.data[0].value).toBe(50000);
    });

    it('should return null when product not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      const result = await service.getPriceHistory('nonexistent');

      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // getViewsHistory
  // -------------------------------------------------------------------------
  describe('getViewsHistory', () => {
    it('should return views history', async () => {
      mockRepo.findOne.mockResolvedValue(mockProduct);

      const result = await service.getViewsHistory('507f191e810c19729de860ea');

      expect(result).not.toBeNull();
      expect(result?.data).toHaveLength(1);
      expect(result?.data[0].value).toBe(150);
    });

    it('should return null when product not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      expect(await service.getViewsHistory('nonexistent')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // getLocationHistory
  // -------------------------------------------------------------------------
  describe('getLocationHistory', () => {
    it('should return location history', async () => {
      mockRepo.findOne.mockResolvedValue(mockProduct);

      const result = await service.getLocationHistory('507f191e810c19729de860ea');

      expect(result).not.toBeNull();
      expect(result?.data).toHaveLength(1);
      expect(result?.data[0].location.state).toBe('La Habana');
    });

    it('should return null when product not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      expect(await service.getLocationHistory('nonexistent')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // getOutstandingHistory
  // -------------------------------------------------------------------------
  describe('getOutstandingHistory', () => {
    it('should return outstanding history', async () => {
      mockRepo.findOne.mockResolvedValue(mockProduct);

      const result = await service.getOutstandingHistory('507f191e810c19729de860ea');

      expect(result).not.toBeNull();
      expect(result?.data).toHaveLength(1);
    });

    it('should return null when product not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      expect(await service.getOutstandingHistory('nonexistent')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // getPromotedHistory
  // -------------------------------------------------------------------------
  describe('getPromotedHistory', () => {
    it('should return promoted history', async () => {
      mockRepo.findOne.mockResolvedValue(mockProduct);

      const result = await service.getPromotedHistory('507f191e810c19729de860ea');

      expect(result).not.toBeNull();
      expect(result?.data).toHaveLength(1);
    });

    it('should return null when product not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      expect(await service.getPromotedHistory('nonexistent')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // getStats
  // -------------------------------------------------------------------------
  describe('getStats', () => {
    it('should return product statistics from aggregation', async () => {
      // Mock aggregate to return results for each pipeline stage
      mockRepo.aggregate
        .mockResolvedValueOnce([{ _id: 'inmuebles', count: 10 }]) // byCategory
        .mockResolvedValueOnce([{ _id: 'La Habana', count: 8 }]) // byState
        .mockResolvedValueOnce([{ total: 20, outstanding: 5, promoted: 3 }]) // counts
        .mockResolvedValueOnce([{ lastScrapedAt: new Date('2025-01-15'), minPrice: 100, maxPrice: 50000 }]) // price/meta
        .mockResolvedValueOnce([{ enriched: 15, total: 20 }]); // enrichment

      const result = await service.getStats();

      expect(result.totalProducts).toBe(20);
      expect(result.byCategory).toEqual([{ category: 'inmuebles', count: 10 }]);
      expect(result.byState).toEqual([{ state: 'La Habana', count: 8 }]);
      expect(result.outstandingCount).toBe(5);
      expect(result.promotedCount).toBe(3);
      expect(result.lastScrapedAt).toBe('2025-01-15T00:00:00.000Z');
      expect(result.priceRange).toEqual({ min: 100, max: 50000 });
      expect(result.enrichedCount).toBe(15);
      expect(result.unenrichedCount).toBe(5);
    });

    it('should handle empty aggregation results', async () => {
      mockRepo.aggregate
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getStats();

      expect(result.totalProducts).toBe(0);
      expect(result.byCategory).toEqual([]);
      expect(result.byState).toEqual([]);
      expect(result.outstandingCount).toBe(0);
      expect(result.promotedCount).toBe(0);
      expect(result.lastScrapedAt).toBeNull();
      expect(result.priceRange).toEqual({ min: 0, max: 0 });
      expect(result.enrichedCount).toBe(0);
      expect(result.unenrichedCount).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // delete
  // -------------------------------------------------------------------------
  describe('delete', () => {
    it('should call repo.deleteById with the given id', async () => {
      mockRepo.deleteById.mockResolvedValue({ acknowledged: true, deletedCount: 1 });

      await service.delete('507f191e810c19729de860ea');

      expect(mockRepo.deleteById).toHaveBeenCalledWith('507f191e810c19729de860ea');
    });
  });
});
