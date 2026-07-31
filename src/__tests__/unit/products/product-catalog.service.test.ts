import { ProductRepository } from '@scrapers/revolico/repositories/product.repository';
import { ILogger } from '@shared/logger.interface';

jest.mock('@scrapers/revolico/repositories/product.repository', () => ({
  __esModule: true,
  ProductRepository: jest.fn().mockImplementation(() => ({
    find: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  })),
}));

import { ProductCatalogService } from '@products/services/product-catalog.service';
import { ProductCatalogQueryDTO } from '@products/services/dto/product-catalog-query.dto';

const mockProduct = {
  _id: { toString: (): string => 'p1' },
  url: 'https://r/x',
  price: 100,
  currency: 'USD',
  isOutstanding: false,
  category: 'compra-venta',
  updatedAt: new Date('2026-07-01T00:00:00Z'),
};

describe('ProductCatalogService', () => {
  let service: ProductCatalogService;
  let repo: jest.Mocked<ProductRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    const logger = {
      context: '',
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as ILogger;
    repo = new (ProductRepository as unknown as jest.Mock)() as jest.Mocked<ProductRepository>;
    service = new ProductCatalogService(repo, logger);
  });

  describe('list', () => {
    it('returns a paginated response with mapped items', async () => {
      repo.find.mockResolvedValue([mockProduct] as never[]);
      repo.count.mockResolvedValue(41);

      const result = await service.list(ProductCatalogQueryDTO.from({ skip: 20, limit: 20 }));

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('p1');
      expect(result.meta).toEqual({ total: 41, skip: 20, limit: 20, hasMore: true });
    });

    it('builds a case-insensitive, regex-escaped search filter', async () => {
      repo.find.mockResolvedValue([]);
      repo.count.mockResolvedValue(0);

      await service.list(ProductCatalogQueryDTO.from({ search: 'c++ (usado)' }));

      const filter = repo.find.mock.calls[0][3] as Record<string, unknown>;
      expect(filter.description).toEqual({
        $regex: 'c\\+\\+ \\(usado\\)',
        $options: 'i',
      });
    });

    it('maps category, subcategory and price range filters', async () => {
      repo.find.mockResolvedValue([]);
      repo.count.mockResolvedValue(0);

      await service.list(
        ProductCatalogQueryDTO.from({
          category: 'compra-venta',
          subcategory: 'celulares',
          minPrice: '50',
          maxPrice: '200',
        }),
      );

      const filter = repo.find.mock.calls[0][3] as Record<string, unknown>;
      expect(filter.category).toBe('compra-venta');
      expect(filter.subcategory).toBe('celulares');
      expect(filter.price).toEqual({ $gte: 50, $lte: 200 });
    });

    it('passes sort/order and the history-less projection to the repo', async () => {
      repo.find.mockResolvedValue([]);
      repo.count.mockResolvedValue(0);

      await service.list(ProductCatalogQueryDTO.from({ sort: 'price', order: 'asc' }));

      expect(repo.find.mock.calls[0][2]).toEqual({ field: 'price', order: 'asc' });
      expect(repo.find.mock.calls[0][4]).toMatchObject({ priceHistory: 0 });
    });

    it('rejects invalid sort values at DTO level', () => {
      expect(() => ProductCatalogQueryDTO.from({ sort: 'seller.phone' })).toThrow();
      expect(() => ProductCatalogQueryDTO.from({ limit: 500 })).toThrow();
    });

    it('propagates repository find failures', async () => {
      repo.find.mockRejectedValue(new Error('mongo down'));
      repo.count.mockResolvedValue(0);

      await expect(service.list(ProductCatalogQueryDTO.from({}))).rejects.toThrow('mongo down');
    });
  });

  describe('categories', () => {
    it('groups subcategories under categories, sorted, skipping empties', async () => {
      repo.aggregate.mockResolvedValue([
        { _id: { category: 'empleo', subcategory: 'ofertas' } },
        { _id: { category: 'compra-venta', subcategory: 'celulares' } },
        { _id: { category: 'compra-venta', subcategory: 'electrodomesticos' } },
        { _id: { category: 'compra-venta', subcategory: null } },
        { _id: { category: null, subcategory: 'huerfana' } },
        { _id: { category: '', subcategory: 'x' } },
      ]);

      const groups = await service.categories();

      expect(groups).toEqual([
        { category: 'compra-venta', subcategories: ['celulares', 'electrodomesticos'] },
        { category: 'empleo', subcategories: ['ofertas'] },
      ]);
    });

    it('propagates aggregation failures', async () => {
      repo.aggregate.mockRejectedValue(new Error('agg failed'));

      await expect(service.categories()).rejects.toThrow('agg failed');
    });
  });
});
