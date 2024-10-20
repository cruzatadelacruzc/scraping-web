import { IFetchProductData } from '@shared/fetch-product-data.interfaces';
import { TYPES } from '@shared/types.container';
import { container } from '@shared/container';
import { InvalidParameterError } from '@scrapers/revolico/errors/invalid-parameter.error';
import { Job } from 'bull';
import { ScrapingProductsType } from '@scrapers/revolico/services/dto';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

jest.mock('puppeteer-extra', () => {
  const puppeteer = jest.requireActual('puppeteer') as any;

  return {
    ...puppeteer,
    use: jest.fn(),
    launch: jest.fn().mockResolvedValue({
      newPage: jest.fn().mockResolvedValue({
        goto: jest.fn(),
        setDefaultTimeout: jest.fn(),
        setViewport: jest.fn(),
        waitForSelector: jest.fn(),
        $: jest.fn(),
        close: jest.fn(),
        url: jest.fn(),
      }),
      close: jest.fn(),
    }),
  };
});

jest.mock('puppeteer-extra-plugin-stealth', () => {
  return jest.fn().mockReturnValue({
    onPageCreated: jest.fn(),
    beforeLaunch: jest.fn(),
  });
});

describe('RevolicoFetchDataService - fetchProductInfoByCategory', () => {
  let service: IFetchProductData;
  let browserMock: {
    newPage: jest.Mock;
    close: jest.Mock;
  };
  let jobMock: Partial<Job<ScrapingProductsType>>;
  const DEFAULT_CURRENCY = 'USD';
  const DEFAULT_PRICE = 100;
  const DEFAULT_COST = `${DEFAULT_PRICE} ${DEFAULT_CURRENCY}`;
  const DEFAULT_PRODUCT_ID = '5645643';
  const DEFAULT_URL = 'https://www.example.com';
  const DEFAULT_PRODUCT_URL = `${DEFAULT_URL}/item/product-path-894784-${DEFAULT_PRODUCT_ID}`;

  beforeEach(() => {
    service = container.get<IFetchProductData>(TYPES.RevolicoData);
    browserMock = {
      newPage: jest.fn().mockResolvedValue({
        goto: jest.fn().mockResolvedValue({ status: () => 200 }),
        setDefaultTimeout: jest.fn(),
        setViewport: jest.fn(),
        $: jest.fn().mockResolvedValue(null),
        waitForSelector: jest.fn().mockResolvedValue({}),
      }),
      close: jest.fn(),
    };

    jobMock = {
      id: 'job-id',
      data: {
        category: 'category',
        subcategory: 'subcategory',
        pageNumber: 1,
        totalPages: 2,
      },
      log: jest.fn(),
      progress: jest.fn(),
    };

    puppeteer.use(StealthPlugin());
    (puppeteer.launch as jest.Mock).mockResolvedValue(browserMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw an error if category is not defined', async () => {
    await expect(service.fetchProductInfoByCategory('', 'subcategory', 1)).rejects.toThrow(new InvalidParameterError('category'));
  });

  it('should correctly call puppeteer and return product data', async () => {
    let pageCounter = 0;
    browserMock.newPage.mockResolvedValue({
      goto: jest.fn().mockImplementation(() => {
        pageCounter++;
        return { status: jest.fn().mockReturnValue(200) };
      }),
      setDefaultTimeout: jest.fn(),
      setViewport: jest.fn(),
      waitForSelector: jest.fn().mockResolvedValue({}),
      url: jest.fn().mockReturnValue(DEFAULT_URL),
      $: jest.fn().mockImplementation(selector => {
        if (selector === 'div.ybloC') {
          return {
            $$: jest.fn().mockResolvedValue([
              {
                $$: jest.fn().mockResolvedValue([
                  {
                    $: jest.fn().mockImplementation(selector => {
                      if (selector === 'a') return { evaluate: jest.fn().mockResolvedValue(`${DEFAULT_PRODUCT_URL}${pageCounter}`) };
                      if (selector === 'span') return { evaluate: jest.fn().mockResolvedValue(DEFAULT_COST) };
                      if (selector === 'p') return { evaluate: jest.fn().mockResolvedValue('product description') };
                      if (selector === 'picture img') return { evaluate: jest.fn().mockResolvedValue('image-url') };
                      if (selector === 'div.dHRSzq') return { evaluate: jest.fn().mockResolvedValue(true) };
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

    const products = await service.fetchProductInfoByCategory('category', 'subcategory', 1, 2, jobMock as Job<ScrapingProductsType>);

    expect(puppeteer.launch).toHaveBeenCalled();
    expect(browserMock.newPage).toHaveBeenCalledTimes(1);
    expect(products).toHaveLength(2);
    expect(products).toEqual(
      expect.arrayContaining([
        {
          ID: `${DEFAULT_PRODUCT_ID}1`,
          category: 'category',
          subcategory: 'subcategory',
          url: `${DEFAULT_PRODUCT_URL}1`,
          cost: DEFAULT_COST,
          description: 'product description',
          imageURL: 'image-url',
          isOutstanding: true,
          price: DEFAULT_PRICE,
          currency: DEFAULT_CURRENCY,
        },
      ]),
    );
    const page = await browserMock.newPage();
    expect(page.goto).toHaveBeenCalledTimes(2);
    expect(browserMock.close).toHaveBeenCalled();
    expect(jobMock.log).toHaveBeenCalled();
    expect(jobMock.progress).toHaveBeenCalled();
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
          ID: `5645643${pageCounter}`,
          url: `${DEFAULT_PRODUCT_URL}${pageCounter}`,
          cost: `${DEFAULT_PRICE * pageCounter} ${DEFAULT_CURRENCY}`,
          description: `product-description-page-${pageCounter}`,
          imageURL: `image-url-page-${pageCounter}`,
          isOutstanding: true,
          price: DEFAULT_PRICE * pageCounter,
          currency: DEFAULT_CURRENCY,
          category: 'category',
          subcategory: 'subcategory',
        });
        return { status: jest.fn().mockReturnValue(200) };
      }),
      url: jest.fn().mockReturnValue(DEFAULT_URL),
      waitForSelector: jest.fn().mockResolvedValue({}),
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
                      if (selector === 'a') return { evaluate: jest.fn().mockResolvedValue(`${DEFAULT_PRODUCT_URL}${pageCounter}`) };
                      if (selector === 'span')
                        return { evaluate: jest.fn().mockResolvedValue(`${DEFAULT_PRICE * pageCounter} ${DEFAULT_CURRENCY}`) };
                      if (selector === 'p') return { evaluate: jest.fn().mockResolvedValue(`product-description-page-${pageCounter}`) };
                      if (selector === 'picture img') return { evaluate: jest.fn().mockResolvedValue(`image-url-page-${pageCounter}`) };
                      if (selector === 'div.dHRSzq') return { evaluate: jest.fn().mockResolvedValue(true) };
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

    const products = await service.fetchProductInfoByCategory('category', 'subcategory', 1, 3, jobMock as Job<ScrapingProductsType>);

    expect(products).toHaveLength(2);
    expect(products).toEqual(expect.arrayContaining(expectedProducts));
    expect(jobMock.log).toHaveBeenCalled();
  });

  it('should return only one product when two products have the same URL', async () => {
    browserMock.newPage.mockResolvedValue({
      goto: jest.fn().mockResolvedValue({
        status: jest.fn().mockReturnValue(200),
      }),
      setDefaultTimeout: jest.fn(),
      setViewport: jest.fn(),
      waitForSelector: jest.fn().mockResolvedValue({}),
      url: jest.fn().mockReturnValue(DEFAULT_URL),
      $: jest.fn().mockImplementation(selector => {
        if (selector === 'div.ybloC') {
          return {
            $$: jest.fn().mockResolvedValue([
              {
                $$: jest.fn().mockResolvedValue([
                  {
                    $: jest.fn().mockImplementation(selector => {
                      if (selector === 'a') return { evaluate: jest.fn().mockResolvedValue(DEFAULT_PRODUCT_URL) };
                      if (selector === 'span') return { evaluate: jest.fn().mockResolvedValue(DEFAULT_COST) };
                      if (selector === 'p') return { evaluate: jest.fn().mockResolvedValue('product description 1') };
                      if (selector === 'picture img') return { evaluate: jest.fn().mockResolvedValue('image-url-1') };
                      if (selector === 'div.dHRSzq') return { evaluate: jest.fn().mockResolvedValue(true) };
                      return null;
                    }),
                  },
                  {
                    $: jest.fn().mockImplementation(selector => {
                      if (selector === 'a') return { evaluate: jest.fn().mockResolvedValue(DEFAULT_PRODUCT_URL) };
                      if (selector === 'span') return { evaluate: jest.fn().mockResolvedValue(DEFAULT_COST) };
                      if (selector === 'p') return { evaluate: jest.fn().mockResolvedValue('product description 2') };
                      if (selector === 'picture img') return { evaluate: jest.fn().mockResolvedValue('image-url-2') };
                      if (selector === 'div.dHRSzq') return { evaluate: jest.fn().mockResolvedValue(false) };
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
    const products = await service.fetchProductInfoByCategory('category', 'subcategory', 1, 2, jobMock as Job<ScrapingProductsType>);

    expect(puppeteer.launch).toHaveBeenCalled();
    expect(browserMock.newPage).toHaveBeenCalledTimes(1);

    expect(products).toHaveLength(1);

    expect(products).toEqual(
      expect.arrayContaining([
        {
          ID: DEFAULT_PRODUCT_ID,
          category: 'category',
          subcategory: 'subcategory',
          url: DEFAULT_PRODUCT_URL,
          cost: DEFAULT_COST,
          description: 'product description 1',
          imageURL: 'image-url-1',
          isOutstanding: true,
          price: 100,
          currency: DEFAULT_CURRENCY,
        },
      ]),
    );
  });

  it('should return an empty array when a page does not contain products', async () => {
    browserMock.newPage.mockResolvedValue({
      goto: jest.fn().mockResolvedValue({ status: jest.fn().mockReturnValue(200) }),
      setDefaultTimeout: jest.fn(),
      setViewport: jest.fn(),
      waitForSelector: jest.fn().mockResolvedValue({}),
      url: jest.fn().mockReturnValue(DEFAULT_URL),
      $: jest.fn().mockImplementation(selector => {
        if (selector === 'div.ybloC') {
          // Simulates a page without products by returning null for product selectors
          return null;
        }

        if (selector === 'a#paginator-next') {
          // simulates that there are no more pages
          return { evaluate: jest.fn().mockResolvedValueOnce(false) };
        }
        return null;
      }),
    });

    const products = await service.fetchProductInfoByCategory('category', 'subcategory', 1, 1, jobMock as Job<ScrapingProductsType>);

    expect(puppeteer.launch).toHaveBeenCalled();
    expect(browserMock.newPage).toHaveBeenCalledTimes(1);

    expect(products).toHaveLength(0);

    expect(browserMock.close).toHaveBeenCalled();
    expect(jobMock.log).toHaveBeenCalledWith('Number of products processed on page (1) : 0');
  });
});
