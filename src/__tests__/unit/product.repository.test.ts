import { ProductRepository } from '@scrapers/revolico/repositories/product.repository';
import productModel, { IRevolicoProduct } from '@scrapers/revolico/models/product.model';
import { DBContext } from '@config/db-config';

describe('ProductRepository — bulkInsertOrUpdate (Fase 1 new fields)', () => {
  let repository: ProductRepository;

  const baseProduct: IRevolicoProduct = {
    ID: 'test-product-1',
    url: 'https://example.com/product/test-1',
    category: 'test-category',
    subcategory: 'test-subcategory',
    cost: '100 USD',
    currency: 'USD',
    price: 100,
    description: 'Test product description',
    isOutstanding: false,
  };

  beforeAll(() => {
    // DBContext is injected but the repository uses the module-level productModel,
    // so we pass a minimal object that satisfies the constructor shape.
    repository = new ProductRepository({} as DBContext);
  });

  beforeEach(async () => {
    await productModel.deleteMany({});
  });

  afterAll(async () => {
    await productModel.deleteMany({});
  });

  // ---------------------------------------------------------------------------
  // 1. metadata is persisted and readable
  // ---------------------------------------------------------------------------
  it('should persist and return metadata when provided', async () => {
    const metadata = { source: 'test', version: 1 };
    const product: IRevolicoProduct = { ...baseProduct, metadata };

    const upserted = await repository.bulkInsertOrUpdate(product);

    expect(upserted).not.toBeNull();
    expect(upserted?.metadata).toEqual(metadata);

    // Verify round-trip via a fresh read from the DB
    const found = await repository.findOne({ ID: product.ID });
    expect(found).not.toBeNull();
    expect(found?.metadata).toEqual(metadata);
  });

  // ---------------------------------------------------------------------------
  // 2. tags is persisted and readable
  // ---------------------------------------------------------------------------
  it('should persist and return tags when provided', async () => {
    const tags = ['tag1', 'tag2'];
    const product: IRevolicoProduct = {
      ...baseProduct,
      ID: 'test-product-tags',
      url: 'https://example.com/product/test-tags',
      tags,
    };

    const upserted = await repository.bulkInsertOrUpdate(product);

    expect(upserted).not.toBeNull();
    expect(upserted?.tags).toEqual(tags);

    const found = await repository.findOne({ ID: product.ID });
    expect(found).not.toBeNull();
    expect(found?.tags).toEqual(tags);
  });

  // ---------------------------------------------------------------------------
  // 3. attributes is persisted and readable
  // ---------------------------------------------------------------------------
  it('should persist and return attributes when provided', async () => {
    const attributes = { color: 'red', size: 'L' };
    const product: IRevolicoProduct = {
      ...baseProduct,
      ID: 'test-product-attrs',
      url: 'https://example.com/product/test-attrs',
      attributes,
    };

    const upserted = await repository.bulkInsertOrUpdate(product);

    expect(upserted).not.toBeNull();
    expect(upserted?.attributes).toEqual(attributes);

    const found = await repository.findOne({ ID: product.ID });
    expect(found).not.toBeNull();
    expect(found?.attributes).toEqual(attributes);
  });

  // ---------------------------------------------------------------------------
  // 4. analytics is persisted and readable
  // ---------------------------------------------------------------------------
  it('should persist and return analytics when provided', async () => {
    const analytics = { viewsPerDay: 10 };
    const product: IRevolicoProduct = {
      ...baseProduct,
      ID: 'test-product-analytics',
      url: 'https://example.com/product/test-analytics',
      analytics,
    };

    const upserted = await repository.bulkInsertOrUpdate(product);

    expect(upserted).not.toBeNull();
    expect(upserted?.analytics).toEqual(analytics);

    const found = await repository.findOne({ ID: product.ID });
    expect(found).not.toBeNull();
    expect(found?.analytics).toEqual(analytics);
  });

  // ---------------------------------------------------------------------------
  // 5. Defaults survive the upsert — fields omitted get schema defaults on insert
  // ---------------------------------------------------------------------------
  it('should apply schema defaults for omitted new fields on upsert insert', async () => {
    const product: IRevolicoProduct = {
      ...baseProduct,
      ID: 'test-product-no-extras',
      url: 'https://example.com/product/test-no-extras',
    };
    // Explicitly omit metadata, tags, attributes, analytics

    const upserted = await repository.bulkInsertOrUpdate(product);

    expect(upserted).not.toBeNull();

    // Mongoose findOneAndUpdate with upsert:true applies schema defaults
    // for new documents. The schema defines:
    //   metadata:   { type: Mixed, default: {} }
    //   tags:       { type: [String], default: [] }
    //   attributes: { type: Mixed, default: {} }
    //   analytics:  { type: Mixed, default: {} }
    expect(upserted?.metadata).toEqual({});
    expect(upserted?.tags).toEqual([]);
    expect(upserted?.attributes).toEqual({});
    expect(upserted?.analytics).toEqual({});

    const found = await repository.findOne({ ID: product.ID });
    expect(found).not.toBeNull();
    expect(found?.metadata).toEqual({});
    expect(found?.tags).toEqual([]);
    expect(found?.attributes).toEqual({});
    expect(found?.analytics).toEqual({});
  });

  // ---------------------------------------------------------------------------
  // 6. All 4 new fields survive together
  // ---------------------------------------------------------------------------
  it('should persist and return all four new fields when provided together', async () => {
    const metadata = { source: 'batch-test', schemaVersion: 2 };
    const tags = ['urgent', 'electronics', 'sale'];
    const attributes = { condition: 'new', warranty: '12 months', brand: 'Samsung' };
    const analytics = { viewsPerDay: 25, clickThroughRate: 0.15, estimatedReach: 1200 };

    const product: IRevolicoProduct = {
      ...baseProduct,
      ID: 'test-product-all-four',
      url: 'https://example.com/product/test-all-four',
      metadata,
      tags,
      attributes,
      analytics,
    };

    const upserted = await repository.bulkInsertOrUpdate(product);

    expect(upserted).not.toBeNull();
    expect(upserted?.metadata).toEqual(metadata);
    expect(upserted?.tags).toEqual(tags);
    expect(upserted?.attributes).toEqual(attributes);
    expect(upserted?.analytics).toEqual(analytics);

    // Verify all four survive a round-trip read
    const found = await repository.findOne({ ID: product.ID });
    expect(found).not.toBeNull();
    expect(found?.metadata).toEqual(metadata);
    expect(found?.tags).toEqual(tags);
    expect(found?.attributes).toEqual(attributes);
    expect(found?.analytics).toEqual(analytics);
  });

  // ---------------------------------------------------------------------------
  // 7. Update: new fields are overwritten on subsequent upsert
  // ---------------------------------------------------------------------------
  it('should overwrite new fields on a subsequent upsert of the same product', async () => {
    const productV1: IRevolicoProduct = {
      ...baseProduct,
      ID: 'test-product-update',
      url: 'https://example.com/product/test-update',
      metadata: { version: 1 },
      tags: ['old-tag'],
      attributes: { color: 'blue' },
      analytics: { viewsPerDay: 5 },
    };

    await repository.bulkInsertOrUpdate(productV1);

    const productV2: IRevolicoProduct = {
      ...baseProduct,
      ID: 'test-product-update',
      url: 'https://example.com/product/test-update',
      metadata: { version: 2, updatedBy: 'scraper-v2' },
      tags: ['new-tag', 'extra-tag'],
      attributes: { color: 'red', size: 'XL' },
      analytics: { viewsPerDay: 15, trend: 'rising' },
    };

    const upserted = await repository.bulkInsertOrUpdate(productV2);

    expect(upserted).not.toBeNull();
    expect(upserted?.metadata).toEqual({ version: 2, updatedBy: 'scraper-v2' });
    expect(upserted?.tags).toEqual(['new-tag', 'extra-tag']);
    expect(upserted?.attributes).toEqual({ color: 'red', size: 'XL' });
    expect(upserted?.analytics).toEqual({ viewsPerDay: 15, trend: 'rising' });

    // Confirm old values are gone
    const found = await repository.findOne({ ID: productV1.ID });
    expect(found?.metadata).not.toEqual({ version: 1 });
    expect(found?.tags).not.toContain('old-tag');
  });
});
