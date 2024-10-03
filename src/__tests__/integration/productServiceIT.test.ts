import { ProductService } from '@scrapers/revolico/services/product.service';
import { container } from '@shared/container';
import { IRevolicoProduct } from '@scrapers/revolico/models/product.model';

describe('ProductService Integration Test', () => {
  let productService: ProductService;
  beforeAll(async () => {
    productService = container.get<ProductService>(ProductService);
  });

  it('should create products correctly', async () => {
    const productData: IRevolicoProduct[] = [
      {
        category: 'compra-venta',
        subcategory: 'celulares-lineas-accesorios',
        url: 'https://example.com/product/1',
        cost: '200 USD',
        description: 'Samsung Galaxy Buds 2 Pro a estrenar',
        imageURL: 'https://example.com/image1.jpg',
        isOutstanding: false,
        currency: 'USD',
        price: 200,
        location: { state: 'Havana' },
        views: 5,
        seller: { name: 'Maria', whatsapp: '+5355468975' },
      },
      {
        category: 'Electronics',
        url: 'https://example.com/product/2',
        cost: '200 USD',
        price: 200,
        currency: 'USD',
        description: 'Example product 2',
        isOutstanding: true,
        imageURL: 'https://example.com/image2.jpg',
        location: { state: 'Havana' },
        views: 5,
        seller: { name: 'Maria', whatsapp: '+5355468975' },
      },
    ];

    const createdProducts: IRevolicoProduct[] = await productService.createMany(productData);
    expect(createdProducts).toBeInstanceOf(Array);
    expect(createdProducts.length).toBe(productData.length);

    createdProducts.forEach((createdProduct, index) => {
      expect(createdProduct).toHaveProperty('_id');
      expect(createdProduct.category).toBe(productData[index].category);
      expect(createdProduct.url).toBe(productData[index].url);
      expect(createdProduct.cost).toBe(productData[index].cost);
      expect(createdProduct.price).toBe(productData[index].price);
      expect(createdProduct.currency).toBe(productData[index].currency);
      expect(createdProduct.description).toBe(productData[index].description);
      expect(createdProduct.isOutstanding).toBe(productData[index].isOutstanding);
      expect(createdProduct.imageURL).toBe(productData[index].imageURL);
      expect(createdProduct.location).toEqual(productData[index].location);
      expect(createdProduct.views).toBe(productData[index].views);
      expect(createdProduct.seller).toEqual(productData[index].seller);
    });
  });
});
