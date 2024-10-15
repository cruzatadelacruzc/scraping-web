import { ScrapingProductsDTO } from '@scrapers/revolico/services/dto';
import { ValidationError } from '@scrapers/revolico/errors';

describe('DTO - Scraping Products', () => {
  it('should create a valid ScrapingProductsDTO with valid data', () => {
    const data = {
      category: 'electronics',
      subcategory: 'laptops',
      pageNumber: 1,
      totalPages: 5,
    };

    const scrapingProductDto = ScrapingProductsDTO.from(data);

    expect(scrapingProductDto).toBeInstanceOf(ScrapingProductsDTO);
    expect(scrapingProductDto.category).toBe(data.category);
    expect(scrapingProductDto.subcategory).toBe(data.subcategory);
    expect(scrapingProductDto.pageNumber).toBe(data.pageNumber);
    expect(scrapingProductDto.totalPages).toBe(data.totalPages);
  });

  it('should throw an error if category is missing', () => {
    const invalidData = {
      subcategory: 'laptops',
      pageNumber: 1,
      totalPages: 5,
    };

    expect(() => ScrapingProductsDTO.from(invalidData)).toThrow(ValidationError);

    try {
      ScrapingProductsDTO.from(invalidData);
    } catch (error) {
      if (error instanceof ValidationError) {
        expect(error.validationErrors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              code: 'invalid_type',
              message: 'Required',
              path: ['category'],
            }),
          ]),
        );
      }
    }
  });

  it('should throw an error if category is empty', () => {
    const data = { category: '' };
    expect(() => ScrapingProductsDTO.from(data)).toThrow(ValidationError);
  });

  it('should create a valid ScrapingProductsDTO with only required category', () => {
    const data = { category: 'electronics' };

    const scrapingProductDto = ScrapingProductsDTO.from(data);
    expect(scrapingProductDto).toBeInstanceOf(ScrapingProductsDTO);
    expect(scrapingProductDto.category).toBe(data.category);
    expect(scrapingProductDto.subcategory).toBeUndefined();
    expect(scrapingProductDto.pageNumber).toBeUndefined();
    expect(scrapingProductDto.totalPages).toBeUndefined();
  });
});
