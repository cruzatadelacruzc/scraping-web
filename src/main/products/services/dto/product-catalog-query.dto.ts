import { z } from 'zod';

export const ProductCatalogQuerySchema = z.object({
  skip: z.coerce.number().min(0).default(0),
  limit: z.coerce.number().min(1).max(50).default(20),
  sort: z.enum(['createdAt', 'price', 'views']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().trim().min(1).optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
});

export type ProductCatalogQueryType = z.infer<typeof ProductCatalogQuerySchema>;

/**
 * Query DTO for the customer-facing product catalog search.
 */
export class ProductCatalogQueryDTO {
  public readonly skip: number;
  public readonly limit: number;
  public readonly sort: 'createdAt' | 'price' | 'views';
  public readonly order: 'asc' | 'desc';
  public readonly search?: string;
  public readonly category?: string;
  public readonly subcategory?: string;
  public readonly minPrice?: number;
  public readonly maxPrice?: number;

  private constructor(parsed: ProductCatalogQueryType) {
    this.skip = parsed.skip;
    this.limit = parsed.limit;
    this.sort = parsed.sort;
    this.order = parsed.order;
    this.search = parsed.search;
    this.category = parsed.category;
    this.subcategory = parsed.subcategory;
    this.minPrice = parsed.minPrice;
    this.maxPrice = parsed.maxPrice;
  }

  /**
   * Parses and validates raw query params (throws ZodError on invalid input).
   * @param query - Raw Express `req.query`.
   * @returns Validated DTO with defaults applied.
   */
  public static from(query: unknown): ProductCatalogQueryDTO {
    return new ProductCatalogQueryDTO(ProductCatalogQuerySchema.parse(query ?? {}));
  }
}
