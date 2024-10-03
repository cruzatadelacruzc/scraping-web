import { ValidationError } from '@scrapers/revolico/errors';
import { z } from 'zod';

const JobSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().optional(),
  pageNumber: z.number().optional(),
  totalPages: z.number().optional(),
});

export type ScrapingProductsType = z.infer<typeof JobSchema>;

/**
 * @description This class is used to create a new job.
 * @param {string} category - The category of the job
 * @param {string| undefined} subcategory - The subcategory of the job
 * @param {number | undefined} pageNumber - The page number of the job
 * @param {number | undefined} totalPages - The total number of pages in the job
 */
export class ScrapingProductsDTO {
  constructor(
    public readonly category: string,
    public readonly subcategory?: string,
    public readonly pageNumber?: number,
    public readonly totalPages?: number,
  ) {}

  /**
   * @description Factory method that creates a `ScrapingProductsDTO` instance from validated data.
   * Validates input data using `JobSchema` and if valid, creates a new `ScrapingProductsDTO` object.
   *
   * @param {Partial<ScrapingProductsType>} data - Input data to be validated.
   * @returns {ScrapingProductsDTO} - New `ScrapingProductsDTO` instance with validated data.
   * @throws {ZodError} - Throws an error if validation fails.
   */
  static from(data: Partial<ScrapingProductsType>): ScrapingProductsDTO {
    try {
      const parsedData = JobSchema.parse(data);
      return new ScrapingProductsDTO(parsedData.category, parsedData.subcategory, parsedData.pageNumber, parsedData.totalPages);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(error.issues.map(({ code, message, path }) => ({ code, message, path })));
      }
      throw error;
    }
  }
}
