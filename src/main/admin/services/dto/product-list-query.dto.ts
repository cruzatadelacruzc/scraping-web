import { z } from 'zod';

export const ProductListQuerySchema = z.object({
  skip: z.coerce.number().min(0).default(0),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort: z.string().default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  search: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  isOutstanding: z.preprocess(v => {
    if (v === 'false' || v === '0') return false;
    if (v === 'true' || v === '1') return true;
    return v;
  }, z.coerce.boolean().optional()),
  isPromoted: z.preprocess(v => {
    if (v === 'false' || v === '0') return false;
    if (v === 'true' || v === '1') return true;
    return v;
  }, z.coerce.boolean().optional()),
  'location.state': z.string().optional(),
  hasEnrichment: z.preprocess(v => {
    if (v === 'false' || v === '0') return false;
    if (v === 'true' || v === '1') return true;
    return v;
  }, z.coerce.boolean().optional()),
});

export type ProductListQueryType = z.infer<typeof ProductListQuerySchema>;

export class ProductListQueryDTO {
  public readonly skip: number;
  public readonly limit: number;
  public readonly sort: string;
  public readonly order: 'asc' | 'desc';
  public readonly category?: string;
  public readonly subcategory?: string;
  public readonly search?: string;
  public readonly minPrice?: number;
  public readonly maxPrice?: number;
  public readonly isOutstanding?: boolean;
  public readonly isPromoted?: boolean;
  public readonly 'location.state'?: string;
  public readonly hasEnrichment?: boolean;

  public constructor(data: ProductListQueryType) {
    this.skip = data.skip;
    this.limit = data.limit;
    this.sort = data.sort;
    this.order = data.order;
    this.category = data.category;
    this.subcategory = data.subcategory;
    this.search = data.search;
    this.minPrice = data.minPrice;
    this.maxPrice = data.maxPrice;
    this.isOutstanding = data.isOutstanding;
    this.isPromoted = data.isPromoted;
    this['location.state'] = data['location.state'];
    this.hasEnrichment = data.hasEnrichment;
  }

  /**
   * Creates a ProductListQueryDTO from raw query input.
   * @param query - Raw query parameters (e.g. from req.query).
   * @returns A validated ProductListQueryDTO instance.
   */
  public static from(query: unknown): ProductListQueryDTO {
    const parsed = ProductListQuerySchema.parse(query ?? {});
    return new ProductListQueryDTO(parsed);
  }
}
