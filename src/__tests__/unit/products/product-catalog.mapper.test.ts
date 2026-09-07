import { toProductCatalogItem } from '@products/mappers/product-catalog.mapper';
import { IRevolicoProduct } from '@scrapers/revolico/models/product.model';

const model = {
  _id: { toString: () => '665f1' },
  url: 'https://www.revolico.com/item/x',
  description: 'iPhone 12 128GB',
  price: 450,
  currency: 'USD',
  imageURL: 'https://img/x.jpg',
  isOutstanding: true,
  views: 320,
  location: { state: 'La Habana', municipality: 'Playa' },
  seller: { name: 'Juan', phone: '+53555', email: 'j@x.cu' },
  category: 'compra-venta',
  subcategory: 'celulares',
  updatedAt: new Date('2026-07-01T10:00:00Z'),
} as unknown as IRevolicoProduct;

describe('toProductCatalogItem', () => {
  it('maps model to reduced catalog item', () => {
    const item = toProductCatalogItem(model);
    expect(item).toEqual({
      id: '665f1',
      url: 'https://www.revolico.com/item/x',
      description: 'iPhone 12 128GB',
      price: 450,
      currency: 'USD',
      imageURL: 'https://img/x.jpg',
      isOutstanding: true,
      views: 320,
      location: { state: 'La Habana', municipality: 'Playa' },
      seller: { name: 'Juan' },
      category: 'compra-venta',
      subcategory: 'celulares',
      updatedAt: '2026-07-01T10:00:00.000Z',
    });
  });

  it('omits seller contact data and internal flags', () => {
    const item = toProductCatalogItem(model) as Record<string, unknown>;
    expect(item.seller).toEqual({ name: 'Juan' });
    expect(item).not.toHaveProperty('hasEnrichment');
    expect(item).not.toHaveProperty('tags');
    expect(item).not.toHaveProperty('cost');
  });

  it('tolerates missing optional fields', () => {
    const minimal = {
      _id: { toString: () => 'a1' },
      url: 'u',
      price: 1,
      currency: 'CUP',
      isOutstanding: false,
      category: 'misc',
    } as unknown as IRevolicoProduct;
    const item = toProductCatalogItem(minimal);
    expect(item.id).toBe('a1');
    expect(item.description).toBeUndefined();
    expect(item.location).toBeUndefined();
    expect(item.seller).toBeUndefined();
    expect(typeof item.updatedAt).toBe('string');
  });
});
