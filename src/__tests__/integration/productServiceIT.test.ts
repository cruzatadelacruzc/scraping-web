import { ProductService } from '@scrapers/revolico/services/product.service';
import { container } from '@shared/container';
import { IRevolicoProduct } from '@scrapers/revolico/models/product.model';
import { ProductRepository } from '@scrapers/revolico/repositories/product.repository';
import { TYPES } from '@shared/types.container';
import { parseCost } from '@utils/normalize-data.util';

describe('ProductService Integration Test', () => {
  let productService: ProductService;
  let productRepository: ProductRepository;
  const PRODUCT_1_ID = '45678848';
  const PRODUCT_2_ID = '46617008';
  const DEFAULT_COST = '300 USD';
  const UPDATE_COST = '500 USD';
  const DEFAULT_URL = 'https://example.com/product/1';
  const UPDATE_URL = 'https://example.com/product/2';
  const DEFAULT_IS_OUTSTANDING = true;
  const UPDATE_IS_OUTSTANDING = false;
  const { value: DEFAULT_PRICE, currency: DEFAULT_CURRENCY } = parseCost(DEFAULT_COST);
  const { value: UPDATE_PRICE, currency: UPDATE_CURRENCY } = parseCost(UPDATE_COST);

  const productData: IRevolicoProduct[] = [
    {
      ID: PRODUCT_1_ID,
      category: 'compra-venta',
      subcategory: 'celulares-lineas-accesorios',
      url: DEFAULT_URL,
      cost: DEFAULT_COST,
      description: 'Samsung Galaxy Buds 2 Pro a estrenar',
      imageURL: 'https://example.com/image1.jpg',
      isOutstanding: DEFAULT_IS_OUTSTANDING,
      currency: DEFAULT_CURRENCY,
      price: DEFAULT_PRICE,
      location: { state: 'Havana' },
      views: 5,
      seller: { name: 'Maria', whatsapp: '+5355468975' },
    },
    {
      ID: PRODUCT_2_ID,
      category: 'Electronics',
      url: UPDATE_URL,
      cost: UPDATE_COST,
      price: UPDATE_PRICE,
      currency: UPDATE_CURRENCY,
      description: 'Example product 3',
      isOutstanding: UPDATE_IS_OUTSTANDING,
      imageURL: 'https://example.com/image2.jpg',
      location: { state: 'Matanza', municipality: 'Varadero' },
      views: 15,
      seller: { name: 'Juana', whatsapp: '+5355468978' },
    },
  ];

  beforeAll(async () => {
    productService = container.get<ProductService>(TYPES.ProductService);
    productRepository = container.get<ProductRepository>(ProductRepository);
    await productRepository.clearAll();
  });

  afterEach(async () => {
    await productRepository.clearAll();
  });

  it('should insert new products and update existing ones', async () => {
    const upsertedProducts = await productService.bulkAddOrEditUrls(productData);

    expect(upsertedProducts.urls).toEqual([DEFAULT_URL, UPDATE_URL]);
    expect(upsertedProducts.errors).toHaveLength(0);

    const insertedProducts = await productRepository.find(0, 2);
    expect(insertedProducts).toHaveLength(2);

    expect(insertedProducts[0]).toEqual(
      expect.objectContaining({
        _id: expect.anything(),
        ID: productData[0].ID,
        category: productData[0].category,
        subcategory: productData[0].subcategory,
        url: productData[0].url,
        cost: productData[0].cost,
        price: productData[0].price,
        currency: productData[0].currency,
        description: productData[0].description,
        isOutstanding: productData[0].isOutstanding,
        imageURL: productData[0].imageURL,
        priceHistory: [{ value: productData[0].price, updatedAt: expect.any(Date) }],
        isOutstandingHistory: [{ value: productData[0].isOutstanding, updatedAt: expect.any(Date) }],
      }),
    );

    const updatedProductData = [
      {
        ID: PRODUCT_1_ID,
        category: 'compra-venta',
        subcategory: 'celulares-lineas-accesorios',
        url: DEFAULT_URL,
        cost: UPDATE_COST,
        description: 'Samsung Galaxy Buds 2 Pro actualizado',
        imageURL: 'https://example.com/image4.jpg',
        isOutstanding: UPDATE_IS_OUTSTANDING,
        currency: UPDATE_CURRENCY,
        price: UPDATE_PRICE,
      },
    ];

    const result = await productService.bulkAddOrEditUrls(updatedProductData);

    expect(result.urls).toEqual([DEFAULT_URL]);
    expect(result.errors).toHaveLength(0);

    const updatedProduct = await productRepository.findOne({ ID: PRODUCT_1_ID });

    expect(updatedProduct).not.toBeNull();
    expect(updatedProduct?.priceHistory).toHaveLength(2);
    expect(updatedProduct?.priceHistory?.[1]).toEqual({ value: UPDATE_PRICE, updatedAt: expect.any(Date) });
    expect(updatedProduct?.price).toBe(UPDATE_PRICE);

    expect(updatedProduct?.isOutstandingHistory).toHaveLength(2);
    expect(updatedProduct?.isOutstandingHistory?.[1]).toEqual({
      value: UPDATE_IS_OUTSTANDING,
      updatedAt: expect.any(Date),
    });
    expect(updatedProduct?.isOutstanding).toBe(UPDATE_IS_OUTSTANDING);
  });

  it('should return errors if required fields are missing', async () => {
    const invalidProductData = { ...productData[0], category: '', cost: '', url: '' };

    const result = await productService.bulkAddOrEditUrls([invalidProductData]);

    expect(result.urls).toHaveLength(0);
    expect(result.errors).toHaveLength(3);
    expect(result.errors).toEqual(
      expect.arrayContaining(['Path `category` is required.', 'Path `url` is required.', 'Path `cost` is required.']),
    );
  });

  it('should return invalid product data if required fields are missing', async () => {
    const invalidProductData = { ...productData[0], category: '' };

    const result = await productService.bulkAddOrEditUrls([invalidProductData]);

    expect(result.urls).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.invalidProductInfo[0]).toEqual(
      expect.objectContaining({
        ID: invalidProductData.ID,
        category: '',
        subcategory: invalidProductData.subcategory,
        url: invalidProductData.url,
        cost: invalidProductData.cost,
        description: invalidProductData.description,
        imageURL: invalidProductData.imageURL,
        isOutstanding: invalidProductData.isOutstanding,
        currency: invalidProductData.currency,
        price: invalidProductData.price,
        location: expect.any(Object),
        views: invalidProductData.views,
        seller: expect.any(Object),
      }),
    );
  });
});
