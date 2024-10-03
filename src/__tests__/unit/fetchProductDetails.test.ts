import { IFetchProductData } from '@shared/fetch-product-data.interfaces';
import { TYPES } from '@shared/types.container';
import { container } from '@shared/container';
import { InvalidParameterError } from '@scrapers/revolico/errors/invalid-parameter.error';
import puppeteer from 'puppeteer';

jest.mock('puppeteer');

describe('RevolicoFetchDataService - fetchProductDetails', () => {
  let service: IFetchProductData;
  let browserMock: {
    newPage: jest.Mock;
    close: jest.Mock;
  };

  beforeEach(() => {
    service = container.get<IFetchProductData>(TYPES.RevolicoData);
    browserMock = {
      newPage: jest.fn().mockResolvedValue({
        goto: jest.fn().mockResolvedValue({ status: () => 200 }),
        setDefaultTimeout: jest.fn(),
        setViewport: jest.fn(),
        $: jest.fn().mockResolvedValue(null),
      }),
      close: jest.fn(),
    };

    (puppeteer.launch as jest.Mock).mockResolvedValue(browserMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw an error if category is not defined', async () => {
    await expect(service.fetchProductInfoByCategory('', 'subcategory', 1)).rejects.toThrow(new InvalidParameterError('category'));
  });

  it('should correctly call puppeteer and return product data', async () => {
    browserMock.newPage.mockResolvedValue({
      goto: jest.fn().mockResolvedValue({
        status: jest.fn().mockReturnValue(200),
      }),
      setDefaultTimeout: jest.fn(),
      setViewport: jest.fn(),
      $: jest.fn().mockImplementation(selector => {
        if (selector === 'div.ybloC') {
          return {
            $$: jest.fn().mockResolvedValue([
              {
                $$: jest.fn().mockResolvedValue([
                  {
                    $: jest.fn().mockImplementation(selector => {
                      if (selector === 'a') return { evaluate: jest.fn().mockResolvedValue('product-url') };
                      if (selector === 'span') return { evaluate: jest.fn().mockResolvedValue('$100') };
                      if (selector === 'p') return { evaluate: jest.fn().mockResolvedValue('product description') };
                      if (selector === 'picture img') return { evaluate: jest.fn().mockResolvedValue('image-url') };
                      return null;
                    }),
                  },
                ]),
              },
            ]),
          };
        }

        if (selector === 'a#paginator-next') {
          return { evaluate: jest.fn().mockResolvedValueOnce(false) };
        }
        return null;
      }),
    });

    const products = await service.fetchProductInfoByCategory('category', 'subcategory', 1, 2);

    expect(puppeteer.launch).toHaveBeenCalled();
    expect(browserMock.newPage).toHaveBeenCalledTimes(1);
    expect(products).toHaveLength(2);
    expect(products).toEqual(
      expect.arrayContaining([
        {
          url: 'product-url',
          cost: '$100',
          description: 'product description',
          imageURL: 'image-url',
        },
      ]),
    );
    const page = await browserMock.newPage();
    expect(page.goto).toHaveBeenCalledTimes(2);
    expect(browserMock.close).toHaveBeenCalled();
  });

  it('should continue when page loading fails', async () => {
    let pageCounter = 0;
    const expectedProducts: any[] = [];

    browserMock.newPage.mockResolvedValue({
      goto: jest.fn().mockImplementation(url => {
        pageCounter++; // Increment the counter after processing the page
        if (url.includes('page=2')) {
          return { status: jest.fn().mockReturnValue(500) };
        }
        expectedProducts.push({
          url: `product-path-page-${pageCounter}`,
          cost: `$${100 * pageCounter}`,
          description: `product-description-page-${pageCounter}`,
          imageURL: `image-url-page-${pageCounter}`,
        });
        return { status: jest.fn().mockReturnValue(200) };
      }),
      setDefaultTimeout: jest.fn(),
      setViewport: jest.fn(),
      $: jest.fn().mockImplementation(selector => {
        if (selector === 'div.ybloC') {
          return {
            $$: jest.fn().mockResolvedValue([
              {
                $$: jest.fn().mockResolvedValue([
                  {
                    $: jest.fn().mockImplementation(selector => {
                      if (selector === 'a') return { evaluate: jest.fn().mockResolvedValue(`product-path-page-${pageCounter}`) };
                      if (selector === 'span') return { evaluate: jest.fn().mockResolvedValue(`$${100 * pageCounter}`) };
                      if (selector === 'p') return { evaluate: jest.fn().mockResolvedValue(`product-description-page-${pageCounter}`) };
                      if (selector === 'picture img') return { evaluate: jest.fn().mockResolvedValue(`image-url-page-${pageCounter}`) };
                      if (selector === 'div.dHRSzq') return { evaluate: jest.fn().mockResolvedValue(`is-outstanding-${pageCounter}`) };
                      return null;
                    }),
                  },
                ]),
              },
            ]),
          };
        }

        if (selector === 'a#paginator-next') {
          return { evaluate: jest.fn().mockResolvedValueOnce(false) };
        }
        return null;
      }),
    });

    const products = await service.fetchProductInfoByCategory('category', 'subcategory', 1, 3);

    expect(products).toHaveLength(2);
    expect(products).toEqual(expect.arrayContaining(expectedProducts));
  });
});
