import mongoose from 'mongoose';
import productModel, { productSchema } from '@scrapers/revolico/models/product.model';

describe('Product Mongoose schema (Fase 1 fields)', () => {
  /** Base fields needed to construct a valid minimal document. */
  const minimalDoc = {
    url: 'https://example.com/product-1',
    price: 100,
    currency: 'CUP',
  };

  // ---------------------------------------------------------------------------
  // 1. Schema paths — the four new fields exist
  // ---------------------------------------------------------------------------
  describe('schema paths', () => {
    it('should have a "metadata" path of type Mixed', () => {
      const path = productSchema.path('metadata');
      expect(path).toBeDefined();
      expect(path.instance).toBe('Mixed');
    });

    it('should have a "tags" path of type array', () => {
      const path = productSchema.path('tags');
      expect(path).toBeDefined();
      expect(path.instance).toBe('Array');
    });

    it('should have an "attributes" path of type Mixed', () => {
      const path = productSchema.path('attributes');
      expect(path).toBeDefined();
      expect(path.instance).toBe('Mixed');
    });

    it('should have an "analytics" path of type Mixed', () => {
      const path = productSchema.path('analytics');
      expect(path).toBeDefined();
      expect(path.instance).toBe('Mixed');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Defaults are applied
  // ---------------------------------------------------------------------------
  describe('defaults', () => {
    it('should default metadata to an empty object', () => {
      const doc = new productModel(minimalDoc);
      expect(doc.metadata).toEqual({});
    });

    it('should default tags to an empty array', () => {
      const doc = new productModel(minimalDoc);
      expect(doc.tags).toEqual([]);
    });

    it('should default attributes to an empty object', () => {
      const doc = new productModel(minimalDoc);
      expect(doc.attributes).toEqual({});
    });

    it('should default analytics to an empty object', () => {
      const doc = new productModel(minimalDoc);
      expect(doc.analytics).toEqual({});
    });
  });

  // ---------------------------------------------------------------------------
  // 3 & 4. category and cost are no longer required
  // ---------------------------------------------------------------------------
  describe('optional fields (relaxed constraints)', () => {
    it('should pass validation without category', () => {
      const doc = new productModel(minimalDoc);
      const err = doc.validateSync();
      expect(err).toBeUndefined();
    });

    it('should pass validation without cost', () => {
      const doc = new productModel(minimalDoc);
      const err = doc.validateSync();
      expect(err).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // 5. url is still required
  // ---------------------------------------------------------------------------
  describe('required fields', () => {
    it('should fail validation when url is missing', () => {
      const doc = new productModel({
        price: 100,
        currency: 'CUP',
      });
      const err = doc.validateSync();
      expect(err).toBeDefined();
      expect(err?.errors).toHaveProperty('url');
    });

    it('should fail validation when price is missing', () => {
      const doc = new productModel({
        url: 'https://example.com/product-2',
        currency: 'CUP',
      });
      const err = doc.validateSync();
      expect(err).toBeDefined();
      expect(err?.errors).toHaveProperty('price');
    });

    it('should fail validation when currency is missing', () => {
      const doc = new productModel({
        url: 'https://example.com/product-3',
        price: 50,
      });
      const err = doc.validateSync();
      expect(err).toBeDefined();
      expect(err?.errors).toHaveProperty('currency');
    });
  });

  // ---------------------------------------------------------------------------
  // 6. tags type casting & acceptance
  // ---------------------------------------------------------------------------
  describe('tags validation', () => {
    it('should cast numeric elements to strings (Mongoose type coercion)', () => {
      const doc = new productModel({
        ...minimalDoc,
        tags: [123 as unknown as string],
      });
      // Mongoose [String] casts values, so 123 becomes "123"
      expect(doc.tags).toEqual(['123']);
      const err = doc.validateSync();
      expect(err).toBeUndefined();
    });

    it('should accept an array of strings', () => {
      const doc = new productModel({
        ...minimalDoc,
        tags: ['electronics', 'used'],
      });
      const err = doc.validateSync();
      expect(err).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // 7 & 8. metadata / analytics accept arbitrary objects
  // ---------------------------------------------------------------------------
  describe('metadata accepts arbitrary objects', () => {
    it('should store a flat object with mixed value types', () => {
      const doc = new productModel({
        ...minimalDoc,
        metadata: { source: 'revolico', schemaVersion: 2, active: true },
      });
      expect(doc.metadata).toEqual({
        source: 'revolico',
        schemaVersion: 2,
        active: true,
      });
      const err = doc.validateSync();
      expect(err).toBeUndefined();
    });

    it('should store a deeply nested object', () => {
      const doc = new productModel({
        ...minimalDoc,
        metadata: { nested: { deep: { key: 'value' } }, list: [1, 2, 3] },
      });
      expect(doc.metadata).toEqual({
        nested: { deep: { key: 'value' } },
        list: [1, 2, 3],
      });
    });
  });

  describe('analytics accepts arbitrary objects', () => {
    it('should store a flat object with mixed value types', () => {
      const doc = new productModel({
        ...minimalDoc,
        analytics: { viewCount: 42, trendScore: 0.87 },
      });
      expect(doc.analytics).toEqual({
        viewCount: 42,
        trendScore: 0.87,
      });
      const err = doc.validateSync();
      expect(err).toBeUndefined();
    });

    it('should store a deeply nested object', () => {
      const doc = new productModel({
        ...minimalDoc,
        analytics: { stats: { mean: 12.5, stddev: 2.1 }, flags: ['trending'] },
      });
      expect(doc.analytics).toEqual({
        stats: { mean: 12.5, stddev: 2.1 },
        flags: ['trending'],
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 9. Timestamps — _id and __v exist
  // ---------------------------------------------------------------------------
  describe('discrimination / timestamp fields', () => {
    it('should auto-generate _id', () => {
      const doc = new productModel(minimalDoc);
      expect(doc._id).toBeDefined();
      expect(doc._id).toBeInstanceOf(mongoose.Types.ObjectId);
    });

    it('should not set __v before save (version key is assigned on persist)', () => {
      const doc = new productModel(minimalDoc);
      // __v is only assigned by MongoDB on save, not on `new Model()`.
      expect(doc.__v).toBeUndefined();
    });
  });
});
