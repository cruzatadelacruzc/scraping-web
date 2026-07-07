import { IRevolicoProduct } from '@scrapers/revolico/models/product.model';

// ---------------------------------------------------------------------------
// We'll test the mapper after it's created.
// Import placeholders — will be resolved in GREEN phase.
// ---------------------------------------------------------------------------

import {
  toProductListItemDTO,
  toProductDetailDTO,
  toProductListItemDTOs,
  toPaginatedResponse,
  toPriceHistoryEntries,
  toViewsHistoryEntries,
  toLocationHistoryEntries,
  toOutstandingHistoryEntries,
  toPromotedHistoryEntries,
} from '@admin/mappers/product.mapper';

describe('ProductMapper', () => {
  // ---------------------------------------------------------------------------
  // Fixtures
  // ---------------------------------------------------------------------------

  const baseProduct: IRevolicoProduct = {
    _id: '507f191e810c19729de860ea',
    ID: 'REV-123',
    category: 'inmuebles',
    subcategory: 'apartamentos',
    url: 'https://revolico.com/item/123',
    description: 'Hermoso apartamento en Vedado',
    cost: '50000',
    currency: 'USD',
    price: 50000,
    imageURL: 'https://img.revolico.com/123.jpg',
    isOutstanding: true,
    isPromoted: true,
    location: { state: 'La Habana', municipality: 'Plaza' },
    views: 150,
    seller: { name: 'Juan', phone: '+5355555555', email: 'juan@email.cu', whatsapp: '+5355555555' },
    priceHistory: [
      { value: 52000, updatedAt: new Date('2025-01-01') },
      { value: 50000, updatedAt: new Date('2025-01-10') },
      { value: 48000, updatedAt: new Date('2025-01-05') },
    ],
    viewsHistory: [
      { value: 100, updatedAt: new Date('2025-01-05') },
      { value: 150, updatedAt: new Date('2025-01-10') },
    ],
    locationHistory: [{ value: { state: 'La Habana', municipality: 'Plaza' }, updatedAt: new Date('2025-01-10') }],
    isOutstandingHistory: [
      { value: false, updatedAt: new Date('2025-01-01') },
      { value: true, updatedAt: new Date('2025-01-10') },
    ],
    isPromotedHistory: [
      { value: false, updatedAt: new Date('2025-01-01') },
      { value: true, updatedAt: new Date('2025-01-10') },
    ],
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-15T00:00:00.000Z',
  } as IRevolicoProduct;

  // ---------------------------------------------------------------------------
  // toProductListItemDTO
  // ---------------------------------------------------------------------------
  describe('toProductListItemDTO', () => {
    it('should map a product to a list item DTO with correct fields', () => {
      const result = toProductListItemDTO(baseProduct);

      expect(result._id).toBe('507f191e810c19729de860ea');
      expect(result.ID).toBe('REV-123');
      expect(result.category).toBe('inmuebles');
      expect(result.subcategory).toBe('apartamentos');
      expect(result.url).toBe('https://revolico.com/item/123');
      expect(result.description).toBe('Hermoso apartamento en Vedado');
      expect(result.cost).toBe('50000');
      expect(result.currency).toBe('USD');
      expect(result.price).toBe(50000);
      expect(result.imageURL).toBe('https://img.revolico.com/123.jpg');
      expect(result.isOutstanding).toBe(true);
      expect(result.isPromoted).toBe(true);
      expect(result.location).toEqual({ state: 'La Habana', municipality: 'Plaza' });
      expect(result.views).toBe(150);
      expect(result.seller).toEqual({ name: 'Juan' });
      expect(result.createdAt).toBe('2025-01-01T00:00:00.000Z');
      expect(result.updatedAt).toBe('2025-01-15T00:00:00.000Z');
    });

    it('should NOT include history arrays in list item DTO', () => {
      const result = toProductListItemDTO(baseProduct);
      expect((result as Record<string, unknown>).priceHistory).toBeUndefined();
      expect((result as Record<string, unknown>).viewsHistory).toBeUndefined();
      expect((result as Record<string, unknown>).locationHistory).toBeUndefined();
      expect((result as Record<string, unknown>).isOutstandingHistory).toBeUndefined();
      expect((result as Record<string, unknown>).isPromotedHistory).toBeUndefined();
    });

    it('should handle missing optional fields gracefully', () => {
      const minimal: IRevolicoProduct = {
        _id: '507f191e810c19729de860ea',
        url: 'https://revolico.com/item/min',
        cost: '10',
        category: 'electronica',
        currency: 'USD',
        price: 10,
        isOutstanding: false,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      } as IRevolicoProduct;

      const result = toProductListItemDTO(minimal);

      expect(result._id).toBe('507f191e810c19729de860ea');
      expect(result.url).toBe('https://revolico.com/item/min');
      expect(result.price).toBe(10);
      expect(result.currency).toBe('USD');
      expect(result.isOutstanding).toBe(false);
      expect(result.cost).toBe('10');
      expect(result.category).toBe('electronica');
      expect(result.subcategory).toBeUndefined();
      expect(result.description).toBeUndefined();
      expect(result.imageURL).toBeUndefined();
      expect(result.isPromoted).toBeUndefined();
      expect(result.views).toBeUndefined();
      expect(result.seller).toBeUndefined();
    });

    it('should serialize _id from ObjectId to string', () => {
      const productWithObjectId = {
        ...baseProduct,
        _id: { toString: () => '507f191e810c19729de860ea' } as unknown as string,
      };
      const result = toProductListItemDTO(productWithObjectId);
      expect(result._id).toBe('507f191e810c19729de860ea');
    });

    it('should handle null location', () => {
      const noLocation = { ...baseProduct, location: undefined };
      const result = toProductListItemDTO(noLocation);
      expect(result.location).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // toProductDetailDTO
  // ---------------------------------------------------------------------------
  describe('toProductDetailDTO', () => {
    it('should map a product to a detail DTO with all fields', () => {
      const result = toProductDetailDTO(baseProduct);

      expect(result._id).toBe('507f191e810c19729de860ea');
      expect(result.ID).toBe('REV-123');
      expect(result.category).toBe('inmuebles');
      expect(result.subcategory).toBe('apartamentos');
      expect(result.url).toBe('https://revolico.com/item/123');
      expect(result.description).toBe('Hermoso apartamento en Vedado');
      expect(result.cost).toBe('50000');
      expect(result.currency).toBe('USD');
      expect(result.price).toBe(50000);
      expect(result.imageURL).toBe('https://img.revolico.com/123.jpg');
      expect(result.isOutstanding).toBe(true);
      expect(result.isPromoted).toBe(true);
      expect(result.location).toEqual({ state: 'La Habana', municipality: 'Plaza' });
      expect(result.views).toBe(150);
      expect(result.seller).toEqual({
        name: 'Juan',
        phone: '+5355555555',
        email: 'juan@email.cu',
        whatsapp: '+5355555555',
      });
    });

    it('should NOT include history arrays in detail DTO', () => {
      const result = toProductDetailDTO(baseProduct);
      expect((result as Record<string, unknown>).priceHistory).toBeUndefined();
      expect((result as Record<string, unknown>).viewsHistory).toBeUndefined();
      expect((result as Record<string, unknown>).locationHistory).toBeUndefined();
    });

    it('should handle minimal product', () => {
      const minimal: IRevolicoProduct = {
        _id: 'abc',
        url: 'https://revolico.com/item/min',
        cost: '5',
        category: 'inmuebles',
        currency: 'USD',
        price: 5,
        isOutstanding: false,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      } as IRevolicoProduct;

      const result = toProductDetailDTO(minimal);
      expect(result._id).toBe('abc');
      expect(result.cost).toBe('5');
      expect(result.category).toBe('inmuebles');
      expect(result.seller).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // toProductListItemDTOs
  // ---------------------------------------------------------------------------
  describe('toProductListItemDTOs', () => {
    it('should map an array of products', () => {
      const result = toProductListItemDTOs([baseProduct, baseProduct]);
      expect(result).toHaveLength(2);
      expect(result[0]._id).toBe('507f191e810c19729de860ea');
    });

    it('should return empty array for empty input', () => {
      expect(toProductListItemDTOs([])).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // toPaginatedResponse
  // ---------------------------------------------------------------------------
  describe('toPaginatedResponse', () => {
    it('should create a paginated response with correct meta', () => {
      const data = [{ id: 'a' }, { id: 'b' }];
      const result = toPaginatedResponse(data, 10, 0, 2);

      expect(result.data).toEqual(data);
      expect(result.meta.total).toBe(10);
      expect(result.meta.skip).toBe(0);
      expect(result.meta.limit).toBe(2);
      expect(result.meta.hasMore).toBe(true);
    });

    it('should set hasMore to false when no more pages', () => {
      const result = toPaginatedResponse([{ id: 'a' }], 1, 0, 20);
      expect(result.meta.hasMore).toBe(false);
    });

    it('should set hasMore to true when total exceeds skip+limit', () => {
      const result = toPaginatedResponse([{ id: 'a' }], 100, 0, 20);
      expect(result.meta.hasMore).toBe(true);
    });

    it('should handle empty data', () => {
      const result = toPaginatedResponse([], 0, 0, 20);
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.hasMore).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // toPriceHistoryEntries
  // ---------------------------------------------------------------------------
  describe('toPriceHistoryEntries', () => {
    it('should sort price history entries desc by updatedAt', () => {
      const result = toPriceHistoryEntries(baseProduct.priceHistory ?? []);
      expect(result.data).toHaveLength(3);
      expect(result.total).toBe(3);
      // Sorted desc: newest first
      expect(result.data[0].value).toBe(50000); // Jan 10
      expect(result.data[1].value).toBe(48000); // Jan 5
      expect(result.data[2].value).toBe(52000); // Jan 1
    });

    it('should handle empty history', () => {
      const result = toPriceHistoryEntries([]);
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should handle undefined history', () => {
      const result = toPriceHistoryEntries(undefined);
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should serialize updatedAt to string', () => {
      const result = toPriceHistoryEntries(baseProduct.priceHistory ?? []);
      expect(typeof result.data[0].updatedAt).toBe('string');
    });
  });

  // ---------------------------------------------------------------------------
  // toViewsHistoryEntries
  // ---------------------------------------------------------------------------
  describe('toViewsHistoryEntries', () => {
    it('should sort views history entries desc by updatedAt', () => {
      const result = toViewsHistoryEntries(baseProduct.viewsHistory ?? []);
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.data[0].value).toBe(150); // Jan 10
      expect(result.data[1].value).toBe(100); // Jan 5
    });

    it('should handle empty/undefined history', () => {
      expect(toViewsHistoryEntries([]).data).toEqual([]);
      expect(toViewsHistoryEntries(undefined).data).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // toLocationHistoryEntries
  // ---------------------------------------------------------------------------
  describe('toLocationHistoryEntries', () => {
    it('should return location history entries sorted desc by updatedAt', () => {
      const history = [
        { value: { state: 'Matanzas', municipality: 'Varadero' }, updatedAt: new Date('2025-01-05') },
        { value: { state: 'La Habana', municipality: 'Plaza' }, updatedAt: new Date('2025-01-10') },
      ];
      const result = toLocationHistoryEntries(history);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].location.state).toBe('La Habana'); // newest first
    });

    it('should handle empty/undefined history', () => {
      expect(toLocationHistoryEntries([]).data).toEqual([]);
      expect(toLocationHistoryEntries(undefined).data).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // toOutstandingHistoryEntries
  // ---------------------------------------------------------------------------
  describe('toOutstandingHistoryEntries', () => {
    it('should return outstanding history entries sorted desc by updatedAt', () => {
      const result = toOutstandingHistoryEntries(baseProduct.isOutstandingHistory ?? []);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].value).toBe(1); // newest — true → 1
      expect(result.data[1].value).toBe(0); // false → 0
    });

    it('should handle empty/undefined history', () => {
      expect(toOutstandingHistoryEntries([]).data).toEqual([]);
      expect(toOutstandingHistoryEntries(undefined).data).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // toPromotedHistoryEntries
  // ---------------------------------------------------------------------------
  describe('toPromotedHistoryEntries', () => {
    it('should return promoted history entries sorted desc by updatedAt', () => {
      const result = toPromotedHistoryEntries(baseProduct.isPromotedHistory ?? []);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].value).toBe(1); // newest — true → 1
      expect(result.data[1].value).toBe(0); // false → 0
    });

    it('should handle empty/undefined history', () => {
      expect(toPromotedHistoryEntries([]).data).toEqual([]);
      expect(toPromotedHistoryEntries(undefined).data).toEqual([]);
    });
  });
});
