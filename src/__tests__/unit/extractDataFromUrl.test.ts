import { extractDataFromUrl } from '@scrapers/revolico/utils/extract-data.util';

describe('Util - extractDataFromUrl', () => {
  const FAKE_URL_1 = 'https://www.example.com/item/lo-mejor-de-lo-mejor-monitor-165hz-__52669205-45321094';
  const FAKE_URL_2 =
    'https://www.example.com/item/viewsonic-fullhd-20-1920x1080-con-angulos-de-178-en-perfecto-estado-ideal-para-espacios-pequenos-sin-perder-calidad-46993249';
  const FAKE_URL_NON_DATA = 'https://www.example.com/item/lo-mejor-de-lo-mejor-monitor';
  const ID_1 = '45321094';
  const ID_2 = '46993249';
  const PHONE_NUMBER_1 = '52669205';

  it('should extract the product ID (last number) correctly', () => {
    expect(extractDataFromUrl(FAKE_URL_1, 'productId')).toBe(ID_1);
    expect(extractDataFromUrl(FAKE_URL_2, 'productId')).toBe(ID_2);
  });

  it('should extract the phone number (penultimate number) correctly', () => {
    expect(extractDataFromUrl(FAKE_URL_1, 'phoneNumber')).toBe(PHONE_NUMBER_1);
  });

  it('should return null if there are not enough numbers in the URL', () => {
    expect(extractDataFromUrl(FAKE_URL_NON_DATA, 'phoneNumber')).toBeNull();
    expect(extractDataFromUrl(FAKE_URL_NON_DATA, 'productId')).toBeNull();
  });

  it('should return null if there is no phone number available', () => {
    expect(extractDataFromUrl(FAKE_URL_2, 'phoneNumber')).toBeNull();
  });

  it('should extract the product ID from a URL with multiple query parameters', () => {
    const url = 'https://www.example.com/item/monitor-165hz-52669205-45321094?p=1&other=abc';
    expect(extractDataFromUrl(url, 'productId')).toBe('45321094');
  });

  it('should extract the phone number from a URL with special characters', () => {
    const url = 'https://www.revolico.com/item/monitor-new__52669205__-45321094';
    expect(extractDataFromUrl(url, 'phoneNumber')).toBe('52669205');
  });
});
