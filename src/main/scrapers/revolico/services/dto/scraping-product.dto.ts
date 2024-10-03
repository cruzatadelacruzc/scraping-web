import { ValidationError } from '@scrapers/revolico/errors';
import { z } from 'zod';

const JobSchema = z.object({
  id: z.string().min(1, 'ID is required'),
});

export type ScrapingProductType = z.infer<typeof JobSchema>;

/**
 * @description This class is used to create a new job.
 * @param {string} id - ID of product
 * @throws {ValidationError} - If the data is invalid
 * @returns {ScrapingProductDTO} - The product scraping data
 * @example
 * const scrapingProductDto = new JobDTO('dasdasd1dad4', 'https://example.com');
 */
export class ScrapingProductDTO {
  constructor(
    public readonly id: string,
  ) {}

  /**
   * @description Factory method that creates a `ScrapingProductDTO` instance from validated data.
   * Validates input data using `JobSchema` and if valid, creates a new `ScrapingProductDTO` object.
   *
   * @param {Partial<ScrapingProductsType>} data - Input data to be validated.
   * @returns {ScrapingProductDTO} - New `ScrapingProductDTO` instance with validated data.
   * @throws {ZodError} - Throws an error if validation fails.
   */
  static from(data: Partial<ScrapingProductType>): ScrapingProductDTO {
    try {
      const parsedData = JobSchema.parse(data);
      return new ScrapingProductDTO(parsedData.id);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(error.issues.map(({ code, message, path }) => ({ code, message, path })));
      }
      throw error;
    }
  }
}
