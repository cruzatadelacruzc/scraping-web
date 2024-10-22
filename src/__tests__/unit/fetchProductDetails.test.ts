import { IFetchProductData } from '@shared/fetch-product-data.interfaces';
import { TYPES } from '@shared/types.container';
import { container } from '@shared/container';
import { InvalidParameterError } from '@scrapers/revolico/errors/invalid-parameter.error';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Job } from 'bull';
import { PageLoadError } from '@scrapers/revolico/errors/page-load.error';

jest.mock('puppeteer-extra', () => {
  const puppeteer = jest.requireActual('puppeteer') as any;
  return {
    ...puppeteer,
    use: jest.fn(),
    launch: jest.fn().mockResolvedValue({
      newPage: jest.fn().mockResolvedValue({
        setDefaultTimeout: jest.fn(),
        setViewport: jest.fn(),
        goto: jest.fn(),
        waitForSelector: jest.fn(),
        $: jest.fn(),
      }),
      close: jest.fn(),
    }),
  };
});

jest.mock('puppeteer-extra-plugin-stealth', () => {
  return jest.fn().mockResolvedValue({
    onPageCreated: jest.fn(),
    beforeLaunch: jest.fn(),
  });
});

describe('RevolicoFetchDataService - fetchProductDetails', () => {
  let service: IFetchProductData;
  let browserMock: {
    newPage: jest.Mock;
    close: jest.Mock;
  };
  let jobMock: Partial<Job<{ url: string }[]>>;
  const DEFAULT_URL = 'https://www.example.com';
  const DEFAULT_SELLER_NAME = 'Jorge';
  const DEFAULT_SELLER_WHATSAPP = '5353042539';
  const DEFAULT_SELLER_PHONE = '5351388639';
  const DEFAULT_SELLER_EMAIL = 'admin@mail.com';
  const DEFAULT_STATE = 'Habana';
  const DEFAULT_MUNICIPALITY = 'San Miguel';
  const DEFAULT_VIEW = 30;
  const DEFAULT_ERROR_STATUS = 500;
  const DEFAULT_SUCCESS_STATUS = 200;

  beforeEach(() => {
    service = container.get<IFetchProductData>(TYPES.RevolicoData);
    browserMock = {
      newPage: jest.fn().mockResolvedValue({
        goto: jest.fn().mockResolvedValue({ status: () => DEFAULT_SUCCESS_STATUS }),
        setDefaultTimeout: jest.fn(),
        setViewport: jest.fn(),
        $: jest.fn().mockResolvedValue(null),
      }),
      close: jest.fn(),
    };

    jobMock = {
      id: 'job-id',
      data: [{ url: DEFAULT_URL }],
      log: jest.fn(),
      progress: jest.fn(),
    };

    puppeteer.use(StealthPlugin());
    (puppeteer.launch as jest.Mock).mockResolvedValue(browserMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw an error if url is not defined', async () => {
    await expect(service.fetchProductDetails('', jobMock as Job<{ url: string }[]>)).rejects.toThrow(new InvalidParameterError('url'));
  });

  it('should correctly call puppeteer and return product details', async () => {
    browserMock.newPage.mockResolvedValue({
      goto: jest.fn().mockResolvedValue({
        status: jest.fn().mockReturnValue(DEFAULT_SUCCESS_STATUS),
      }),
      setDefaultTimeout: jest.fn(),
      setViewport: jest.fn(),
      waitForSelector: jest.fn().mockResolvedValue({}),
      $: jest.fn().mockImplementation(selector => {
        if (selector === 'div.bzsCgK') {
          return {
            $: jest.fn().mockImplementation(innerSelector => {
              if (innerSelector === 'p.cZACiy') {
                return { evaluate: jest.fn().mockResolvedValue(`${DEFAULT_VIEW}`) };
              }
              if (innerSelector === 'p[data-cy="adLocation"]') {
                return { evaluate: jest.fn().mockResolvedValue(`${DEFAULT_MUNICIPALITY},${DEFAULT_STATE}`) };
              }
              return null;
            }),
          };
        }

        if (selector === 'div.fmEzaW') {
          return {
            $: jest.fn().mockImplementation(innerSelector => {
              if (innerSelector === 'p[data-cy="adName"]') {
                return { evaluate: jest.fn().mockResolvedValue(DEFAULT_SELLER_NAME) };
              }
              if (innerSelector === 'a[href^="https://wa.me/"]') {
                return { evaluate: jest.fn().mockResolvedValue(DEFAULT_SELLER_WHATSAPP) };
              }
              if (innerSelector === 'a[href^="tel:"]') {
                return { evaluate: jest.fn().mockResolvedValue(DEFAULT_SELLER_PHONE) };
              }
              if (innerSelector === 'a[href^="mailto:"]') {
                return { evaluate: jest.fn().mockResolvedValue(DEFAULT_SELLER_EMAIL) };
              }
              return null;
            }),
          };
        }

        return null;
      }),
    });

    const productDetails = await service.fetchProductDetails(DEFAULT_URL, jobMock as Job<{ url: string }[]>);

    expect(puppeteer.launch).toHaveBeenCalled();
    expect(browserMock.newPage).toHaveBeenCalledTimes(1);

    expect(productDetails).toEqual({
      views: DEFAULT_VIEW,
      location: { state: DEFAULT_STATE, municipality: DEFAULT_MUNICIPALITY },
      seller: {
        name: DEFAULT_SELLER_NAME,
        whatsapp: DEFAULT_SELLER_WHATSAPP,
        phone: DEFAULT_SELLER_PHONE,
        email: DEFAULT_SELLER_EMAIL,
      },
    });

    const page = await browserMock.newPage();
    expect(page.goto).toHaveBeenCalledTimes(1);
    expect(browserMock.close).toHaveBeenCalled();
  });

  it('should throw a PageLoadError if page fails to load', async () => {
    browserMock.newPage.mockResolvedValue({
      goto: jest.fn().mockResolvedValue({
        status: jest.fn().mockReturnValue(DEFAULT_ERROR_STATUS),
      }),
      setDefaultTimeout: jest.fn(),
      setViewport: jest.fn(),
      waitForSelector: jest.fn(),
    });

    await expect(service.fetchProductDetails(DEFAULT_URL, jobMock as Job<{ url: string }[]>)).rejects.toThrow(PageLoadError);

    expect(puppeteer.launch).toHaveBeenCalled();
    expect(browserMock.newPage).toHaveBeenCalledTimes(1);
    expect(browserMock.close).toHaveBeenCalled();

    expect(jobMock.log).toHaveBeenCalledWith(`Failed to load page: ${DEFAULT_URL} with status ${DEFAULT_ERROR_STATUS}`);
    expect(jobMock.log).toHaveBeenCalledWith(
      `Error initializing scraping: Error: Failed to load page: ${DEFAULT_URL} with status ${DEFAULT_ERROR_STATUS}`,
    );
  });

  it('Should return SELLER default values ​​if expected selectors are missing', async () => {
    browserMock.newPage.mockResolvedValue({
      goto: jest.fn().mockResolvedValue({ status: jest.fn().mockReturnValue(DEFAULT_SUCCESS_STATUS) }),
      setDefaultTimeout: jest.fn(),
      setViewport: jest.fn(),
      waitForSelector: jest.fn().mockResolvedValue({}),
      $: jest.fn().mockImplementation(selector => {
        if (selector === 'div.bzsCgK') {
          return {
            $: jest.fn().mockImplementation(innerSelector => {
              if (innerSelector === 'p.cZACiy') {
                return { evaluate: jest.fn().mockResolvedValue(`${DEFAULT_VIEW}`) };
              }
              if (innerSelector === 'p[data-cy="adLocation"]') {
                return { evaluate: jest.fn().mockResolvedValue(`${DEFAULT_MUNICIPALITY},${DEFAULT_STATE}`) };
              }
              return null;
            }),
          };
        }
        return null;
      }),
    });

    const productDetails = await service.fetchProductDetails(DEFAULT_URL, jobMock as Job<{ url: string }[]>);

    expect(puppeteer.launch).toHaveBeenCalled();
    expect(browserMock.newPage).toHaveBeenCalledTimes(1);

    expect(productDetails).toEqual({
      views: DEFAULT_VIEW,
      location: { state: DEFAULT_STATE, municipality: DEFAULT_MUNICIPALITY },
      seller: {
        name: '',
        whatsapp: '',
        phone: '',
        email: '',
      },
    });

    expect(browserMock.close).toHaveBeenCalled();
  });

  it('Should return Location default values ​​if expected selectors are missing', async () => {
    browserMock.newPage.mockResolvedValue({
      goto: jest.fn().mockResolvedValue({ status: jest.fn().mockReturnValue(DEFAULT_SUCCESS_STATUS) }),
      setDefaultTimeout: jest.fn(),
      setViewport: jest.fn(),
      waitForSelector: jest.fn().mockResolvedValue({}),
      $: jest.fn().mockImplementation(selector => {
        if (selector === 'div.fmEzaW') {
          return {
            $: jest.fn().mockImplementation(innerSelector => {
              if (innerSelector === 'p[data-cy="adName"]') {
                return { evaluate: jest.fn().mockResolvedValue(DEFAULT_SELLER_NAME) };
              }
              if (innerSelector === 'a[href^="https://wa.me/"]') {
                return { evaluate: jest.fn().mockResolvedValue(DEFAULT_SELLER_WHATSAPP) };
              }
              if (innerSelector === 'a[href^="tel:"]') {
                return { evaluate: jest.fn().mockResolvedValue(DEFAULT_SELLER_PHONE) };
              }
              if (innerSelector === 'a[href^="mailto:"]') {
                return { evaluate: jest.fn().mockResolvedValue(DEFAULT_SELLER_EMAIL) };
              }
              return null;
            }),
          };
        }
        return null;
      }),
    });

    const productDetails = await service.fetchProductDetails(DEFAULT_URL, jobMock as Job<{ url: string }[]>);

    expect(puppeteer.launch).toHaveBeenCalled();
    expect(browserMock.newPage).toHaveBeenCalledTimes(1);

    expect(productDetails).toEqual({
      views: 0,
      location: { state: '' },
      seller: {
        name: DEFAULT_SELLER_NAME,
        whatsapp: DEFAULT_SELLER_WHATSAPP,
        phone: DEFAULT_SELLER_PHONE,
        email: DEFAULT_SELLER_EMAIL,
      },
    });

    expect(browserMock.close).toHaveBeenCalled();
  });

  it('should throw an error if the page has an unexpected structure', async () => {
    browserMock.newPage.mockResolvedValue({
      goto: jest.fn().mockResolvedValue({
        status: jest.fn().mockReturnValue(DEFAULT_SUCCESS_STATUS),
      }),
      setDefaultTimeout: jest.fn(),
      setViewport: jest.fn(),
      waitForSelector: jest.fn().mockResolvedValue(null),
      $: jest.fn().mockResolvedValue(null),
    });

    const logWarnMock = jest.spyOn((service as any)['_log'], 'warn').mockImplementation(() => {});

    const result = await service.fetchProductDetails(DEFAULT_URL, jobMock as Job<{ url: string }[]>);

    expect(puppeteer.launch).toHaveBeenCalled();
    expect(browserMock.newPage).toHaveBeenCalledTimes(1);

    expect(result).toBeNull();

    expect(logWarnMock).toHaveBeenCalledWith('Page structure unexpected: missing views/location or seller/contact container');

    expect(browserMock.close).toHaveBeenCalled();
  });
});
