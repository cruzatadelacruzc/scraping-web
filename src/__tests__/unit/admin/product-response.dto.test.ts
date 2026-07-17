import {
  ProductListItemDTO,
  ProductDetailDTO,
  PriceHistoryEntrySchema,
  LocationHistoryEntrySchema,
  ProductHistorySchema,
} from '@admin/services/dto/product-response.dto';

describe('ProductListItemDTO', () => {
  const validMinimal = {
    _id: '64a1b2c3d4e5f6a7b8c9d0e1',
    url: 'https://example.com/product-1',
    cost: '100',
    category: 'electronica',
    currency: 'USD',
    price: 100,
    isOutstanding: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
    hasEnrichment: false,
    hasAttributes: false,
    hasAnalytics: false,
    tags: [],
  };

  it('should accept a minimal valid object', () => {
    const result = ProductListItemDTO.from(validMinimal);
    expect(result._id).toBe(validMinimal._id);
    expect(result.url).toBe(validMinimal.url);
    expect(result.price).toBe(100);
  });

  it('should accept all optional fields', () => {
    const full = {
      ...validMinimal,
      ID: 'PROD-001',
      category: 'inmuebles',
      subcategory: 'apartamentos',
      description: 'Nice apartment',
      cost: '50000 USD',
      imageURL: 'https://example.com/img.jpg',
      isPromoted: true,
      location: { state: 'La Habana', municipality: 'Playa' },
      views: 150,
      seller: { name: 'John Doe' },
    };
    const result = ProductListItemDTO.from(full);
    expect(result.ID).toBe('PROD-001');
    expect(result.category).toBe('inmuebles');
    expect(result.location?.state).toBe('La Habana');
    expect(result.seller?.name).toBe('John Doe');
    expect(result.views).toBe(150);
  });

  it('should reject missing required fields (_id, url, cost, category, currency, price)', () => {
    expect(() => ProductListItemDTO.from({ url: 'x' })).toThrow();
    expect(() => ProductListItemDTO.from({ _id: 'x' })).toThrow();
    expect(() => ProductListItemDTO.from({})).toThrow();
    expect(() => ProductListItemDTO.from(null)).toThrow();
  });
});

describe('ProductDetailDTO', () => {
  const validMinimal = {
    _id: '64a1b2c3d4e5f6a7b8c9d0e1',
    url: 'https://example.com/product-1',
    cost: '100',
    category: 'electronica',
    currency: 'USD',
    price: 100,
    isOutstanding: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
  };

  it('should accept a minimal valid object', () => {
    const result = ProductDetailDTO.from(validMinimal);
    expect(result._id).toBe(validMinimal._id);
  });

  it('should accept full detail with all fields', () => {
    const full = {
      ...validMinimal,
      ID: 'PROD-001',
      category: 'inmuebles',
      subcategory: 'apartamentos',
      description: 'Nice apartment in Vedado',
      cost: '50000 USD',
      imageURL: 'https://example.com/img.jpg',
      isPromoted: true,
      location: { state: 'La Habana', municipality: 'Vedado' },
      views: 250,
      seller: { name: 'John Doe', phone: '+5355555555', email: 'john@example.com', whatsapp: '+5355555555' },
    };
    const result = ProductDetailDTO.from(full);
    expect(result.cost).toBe('50000 USD');
    expect(result.category).toBe('inmuebles');
    expect(result.seller?.phone).toBe('+5355555555');
    expect(result.seller?.email).toBe('john@example.com');
  });

  it('should reject missing required fields', () => {
    expect(() => ProductDetailDTO.from({})).toThrow();
    expect(() => ProductDetailDTO.from(null)).toThrow();
  });
});

describe('PriceHistoryEntrySchema', () => {
  it('should accept valid price history entry', () => {
    const result = PriceHistoryEntrySchema.parse({ value: 100, updatedAt: '2024-01-01T00:00:00.000Z' });
    expect(result.value).toBe(100);
    expect(result.updatedAt).toBe('2024-01-01T00:00:00.000Z');
  });

  it('should reject missing required fields', () => {
    expect(() => PriceHistoryEntrySchema.parse({})).toThrow();
    expect(() => PriceHistoryEntrySchema.parse({ value: 100 })).toThrow();
  });
});

describe('LocationHistoryEntrySchema', () => {
  it('should accept valid location history entry with municipality', () => {
    const result = LocationHistoryEntrySchema.parse({
      location: { state: 'La Habana', municipality: 'Playa' },
      updatedAt: '2024-01-01T00:00:00.000Z',
    });
    expect(result.location.state).toBe('La Habana');
    expect(result.location.municipality).toBe('Playa');
  });

  it('should accept location history entry without municipality', () => {
    const result = LocationHistoryEntrySchema.parse({
      location: { state: 'La Habana' },
      updatedAt: '2024-01-01T00:00:00.000Z',
    });
    expect(result.location.municipality).toBeUndefined();
  });
});

describe('ProductHistorySchema (generic wrapper)', () => {
  it('should wrap items in { data, total } structure', () => {
    const schema = ProductHistorySchema(PriceHistoryEntrySchema);
    const result = schema.parse({
      data: [{ value: 100, updatedAt: '2024-01-01T00:00:00.000Z' }],
      total: 1,
    });
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('should accept empty data array', () => {
    const schema = ProductHistorySchema(LocationHistoryEntrySchema);
    const result = schema.parse({ data: [], total: 0 });
    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
  });
});
