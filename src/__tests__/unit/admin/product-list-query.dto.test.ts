import { ProductListQueryDTO, ProductListQueryType } from '@admin/services/dto/product-list-query.dto';

describe('ProductListQueryDTO', () => {
  describe('defaults', () => {
    it('should apply default values when called with empty object', () => {
      const result = ProductListQueryDTO.from({});
      expect(result.skip).toBe(0);
      expect(result.limit).toBe(20);
      expect(result.sort).toBe('createdAt');
      expect(result.order).toBe('desc');
    });

    it('should apply defaults when called with null', () => {
      const result = ProductListQueryDTO.from(null);
      expect(result.skip).toBe(0);
      expect(result.limit).toBe(20);
    });

    it('should apply defaults when called with undefined', () => {
      const result = ProductListQueryDTO.from(undefined);
      expect(result.skip).toBe(0);
      expect(result.limit).toBe(20);
    });
  });

  describe('skip / limit boundaries', () => {
    it('should coerce string skip to number and accept valid values', () => {
      const result = ProductListQueryDTO.from({ skip: '10', limit: '50' });
      expect(result.skip).toBe(10);
      expect(result.limit).toBe(50);
    });

    it('should reject negative skip', () => {
      expect(() => ProductListQueryDTO.from({ skip: -5 })).toThrow();
    });

    it('should reject limit of 0', () => {
      expect(() => ProductListQueryDTO.from({ limit: 0 })).toThrow();
    });

    it('should reject limit greater than 100', () => {
      expect(() => ProductListQueryDTO.from({ limit: 101 })).toThrow();
    });

    it('should accept limit of 100 (max boundary)', () => {
      const result = ProductListQueryDTO.from({ limit: 100 });
      expect(result.limit).toBe(100);
    });

    it('should accept limit of 1 (min boundary)', () => {
      const result = ProductListQueryDTO.from({ limit: 1 });
      expect(result.limit).toBe(1);
    });
  });

  describe('sort / order', () => {
    it('should accept custom sort field', () => {
      const result = ProductListQueryDTO.from({ sort: 'price' });
      expect(result.sort).toBe('price');
    });

    it('should accept ascending order', () => {
      const result = ProductListQueryDTO.from({ order: 'asc' });
      expect(result.order).toBe('asc');
    });

    it('should reject invalid order value', () => {
      expect(() => ProductListQueryDTO.from({ order: 'invalid' })).toThrow();
    });
  });

  describe('optional filters', () => {
    it('should accept category', () => {
      const result = ProductListQueryDTO.from({ category: 'inmuebles' });
      expect(result.category).toBe('inmuebles');
    });

    it('should accept subcategory', () => {
      const result = ProductListQueryDTO.from({ subcategory: 'apartamentos' });
      expect(result.subcategory).toBe('apartamentos');
    });

    it('should accept search string', () => {
      const result = ProductListQueryDTO.from({ search: 'casa' });
      expect(result.search).toBe('casa');
    });

    it('should accept minPrice and maxPrice', () => {
      const result = ProductListQueryDTO.from({ minPrice: '100', maxPrice: '500' });
      expect(result.minPrice).toBe(100);
      expect(result.maxPrice).toBe(500);
    });

    it('should accept isOutstanding', () => {
      const result = ProductListQueryDTO.from({ isOutstanding: 'true' });
      expect(result.isOutstanding).toBe(true);
    });

    it('should accept isPromoted', () => {
      const result = ProductListQueryDTO.from({ isPromoted: 'false' });
      expect(result.isPromoted).toBe(false);
    });

    it('should accept location.state', () => {
      const result = ProductListQueryDTO.from({ 'location.state': 'La Habana' });
      expect(result['location.state']).toBe('La Habana');
    });

    it('should have all optional fields undefined when not provided', () => {
      const result = ProductListQueryDTO.from({});
      expect(result.category).toBeUndefined();
      expect(result.subcategory).toBeUndefined();
      expect(result.search).toBeUndefined();
      expect(result.minPrice).toBeUndefined();
      expect(result.maxPrice).toBeUndefined();
      expect(result.isOutstanding).toBeUndefined();
      expect(result.isPromoted).toBeUndefined();
      expect(result['location.state']).toBeUndefined();
    });
  });

  describe('type inference', () => {
    it('should export ProductListQueryType', () => {
      // Compile-time check: ensure the type is inferred from the schema
      const _typeCheck: ProductListQueryType = {} as ProductListQueryType;
      expect(_typeCheck).toBeDefined();
    });
  });
});
