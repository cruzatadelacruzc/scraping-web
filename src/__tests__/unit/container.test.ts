import { TYPES } from '@shared/types.container';
import { container } from '@shared/container';
import { IFetchProductData } from '@shared/fetch-product-data.interfaces';

describe('Inversify Container', () => {
  it('should resolve the service correctly from the container', async () => {
    const service: IFetchProductData = container.get<IFetchProductData>(TYPES.RevolicoData);

    // Verify service definition
    expect(service).toBeDefined();
    // Verify that the attribute exists
    expect(service).toHaveProperty('_baseURL');
    // Verify that the method exists
    expect(service.fetchProductInfoByCategory).toBeInstanceOf(Function);
  });
});
