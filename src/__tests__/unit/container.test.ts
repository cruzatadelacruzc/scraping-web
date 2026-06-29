import { TYPES } from '@shared/types.container';
import { container } from '@shared/container';
import { IFetchProductData } from '@shared/fetch-product-data.interface';

describe('Inversify Container', () => {
  it('should resolve the Revolico fetch service correctly from the container', async () => {
    const service: IFetchProductData = container.get<IFetchProductData>(TYPES.RevolicoData);

    expect(service).toBeDefined();
    expect(service).toHaveProperty('_baseURL');
    expect(typeof service.buildURL).toBe('function');
    expect(typeof service.fetchRenderedJson).toBe('function');
  });
});
