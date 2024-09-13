import { IFetchProductData } from '@shared/fetch-product-data.interfaces';
import { TYPES } from '@shared/types.container';
import { container } from '@shared/container';

describe('RevolicoFetchDataService - BuildURL', () => {
  let service: IFetchProductData;
  const url = 'https://www.revolico.com/search';
  const category = 'category';
  const subcategory = 'subcategory';
  const pageNumber = 1;
  
  beforeAll(() => {
    service = container.get<IFetchProductData>(TYPES.RevolicoData);
  });

  it('should build the correct URL with query parameters', () => {       

    const result = service.buildURL(category, subcategory, pageNumber);

    expect(result).toBe(`${url}?category=${category}&subcategory=${subcategory}&page=${pageNumber}`);
  });

  it('should build the URL with missing subcategory parameter', () => {    

    const result = service.buildURL(category, '', pageNumber);
    
    expect(result).not.toMatch(`${url}?category=${category}&subcategory=${subcategory}&page=${pageNumber}`);
  });
});
