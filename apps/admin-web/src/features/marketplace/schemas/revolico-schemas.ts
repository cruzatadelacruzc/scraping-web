import { z } from 'zod';

/**
 * Zod schema for the scraper config expression editor form.
 * The expression must be non-empty; the server validates it as valid JSONata.
 */
export const configExpressionSchema = z.object({
  expression: z.string().min(1, 'Expression is required'),
});

export type ConfigExpressionFormValues = z.infer<typeof configExpressionSchema>;

/**
 * Zod schema for the manual scraping job trigger form.
 * Category is required; subcategory is optional.
 * pageNumber and totalPages, when present, must be >= 1.
 */
export const scrapeJobSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().optional().default(''),
  pageNumber: z.preprocess(
    (val) =>
      val === '' || val === undefined || (typeof val === 'number' && isNaN(val)) ? undefined : val,
    z
      .number({ invalid_type_error: 'Page number must be a number' })
      .int('Page number must be a whole number')
      .min(1, 'Page number must be at least 1')
      .optional(),
  ),
  totalPages: z.preprocess(
    (val) =>
      val === '' || val === undefined || (typeof val === 'number' && isNaN(val)) ? undefined : val,
    z
      .number({ invalid_type_error: 'Total pages must be a number' })
      .int('Total pages must be a whole number')
      .min(1, 'Total pages must be at least 1')
      .optional(),
  ),
});

export type ScrapeJobFormValues = z.infer<typeof scrapeJobSchema>;
