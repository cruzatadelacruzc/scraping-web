import { z } from 'zod';

// ---------------------------------------------------------------------------
// ProductListItemDTO — lightweight, no history arrays
// ---------------------------------------------------------------------------

export const ProductListItemSchema = z.object({
  _id: z.string(),
  ID: z.string().optional(),
  category: z.string(),
  subcategory: z.string().optional(),
  url: z.string(),
  description: z.string().optional(),
  cost: z.string(),
  currency: z.string(),
  price: z.number(),
  imageURL: z.string().optional(),
  isOutstanding: z.boolean(),
  isPromoted: z.boolean().optional(),
  location: z
    .object({
      state: z.string().optional(),
      municipality: z.string().optional(),
    })
    .optional(),
  views: z.number().optional(),
  seller: z
    .object({
      name: z.string().optional(),
    })
    .optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ProductListItemType = z.infer<typeof ProductListItemSchema>;

export class ProductListItemDTO {
  public readonly _id: string;
  public readonly ID?: string;
  public readonly category: string;
  public readonly subcategory?: string;
  public readonly url: string;
  public readonly description?: string;
  public readonly cost: string;
  public readonly currency: string;
  public readonly price: number;
  public readonly imageURL?: string;
  public readonly isOutstanding: boolean;
  public readonly isPromoted?: boolean;
  public readonly location?: { state?: string; municipality?: string };
  public readonly views?: number;
  public readonly seller?: { name?: string };
  public readonly createdAt: string;
  public readonly updatedAt: string;

  public constructor(data: ProductListItemType) {
    this._id = data._id;
    this.ID = data.ID;
    this.category = data.category;
    this.subcategory = data.subcategory;
    this.url = data.url;
    this.description = data.description;
    this.cost = data.cost;
    this.currency = data.currency;
    this.price = data.price;
    this.imageURL = data.imageURL;
    this.isOutstanding = data.isOutstanding;
    this.isPromoted = data.isPromoted;
    this.location = data.location;
    this.views = data.views;
    this.seller = data.seller;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  /**
   * Creates a ProductListItemDTO from raw data.
   * @param data - The raw product data (typically from Mongoose).
   * @returns A validated ProductListItemDTO instance.
   */
  public static from(data: unknown): ProductListItemDTO {
    const parsed = ProductListItemSchema.parse(data);
    return new ProductListItemDTO(parsed);
  }
}

// ---------------------------------------------------------------------------
// ProductDetailDTO — full detail, no history arrays
// ---------------------------------------------------------------------------

export const ProductDetailSchema = z.object({
  _id: z.string(),
  ID: z.string().optional(),
  category: z.string(),
  subcategory: z.string().optional(),
  url: z.string(),
  description: z.string().optional(),
  cost: z.string(),
  currency: z.string(),
  price: z.number(),
  imageURL: z.string().optional(),
  isOutstanding: z.boolean(),
  isPromoted: z.boolean().optional(),
  location: z
    .object({
      state: z.string().optional(),
      municipality: z.string().optional(),
    })
    .optional(),
  views: z.number().optional(),
  seller: z
    .object({
      name: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      whatsapp: z.string().optional(),
    })
    .optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ProductDetailType = z.infer<typeof ProductDetailSchema>;

export class ProductDetailDTO {
  public readonly _id: string;
  public readonly ID?: string;
  public readonly category: string;
  public readonly subcategory?: string;
  public readonly url: string;
  public readonly description?: string;
  public readonly cost: string;
  public readonly currency: string;
  public readonly price: number;
  public readonly imageURL?: string;
  public readonly isOutstanding: boolean;
  public readonly isPromoted?: boolean;
  public readonly location?: { state?: string; municipality?: string };
  public readonly views?: number;
  public readonly seller?: { name?: string; phone?: string; email?: string; whatsapp?: string };
  public readonly createdAt: string;
  public readonly updatedAt: string;

  public constructor(data: ProductDetailType) {
    this._id = data._id;
    this.ID = data.ID;
    this.category = data.category;
    this.subcategory = data.subcategory;
    this.url = data.url;
    this.description = data.description;
    this.cost = data.cost;
    this.currency = data.currency;
    this.price = data.price;
    this.imageURL = data.imageURL;
    this.isOutstanding = data.isOutstanding;
    this.isPromoted = data.isPromoted;
    this.location = data.location;
    this.views = data.views;
    this.seller = data.seller;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  /**
   * Creates a ProductDetailDTO from raw data.
   * @param data - The raw product data (typically from Mongoose).
   * @returns A validated ProductDetailDTO instance.
   */
  public static from(data: unknown): ProductDetailDTO {
    const parsed = ProductDetailSchema.parse(data);
    return new ProductDetailDTO(parsed);
  }
}

// ---------------------------------------------------------------------------
// PriceHistoryEntry
// ---------------------------------------------------------------------------

export const PriceHistoryEntrySchema = z.object({
  value: z.number(),
  updatedAt: z.string(),
});

export type PriceHistoryEntryType = z.infer<typeof PriceHistoryEntrySchema>;

// ---------------------------------------------------------------------------
// LocationHistoryEntry
// ---------------------------------------------------------------------------

export const LocationHistoryEntrySchema = z.object({
  location: z.object({
    state: z.string(),
    municipality: z.string().optional(),
  }),
  updatedAt: z.string(),
});

export type LocationHistoryEntryType = z.infer<typeof LocationHistoryEntrySchema>;

// ---------------------------------------------------------------------------
// ProductHistoryDTO — generic wrapper for history arrays
// ---------------------------------------------------------------------------

export const ProductHistorySchema = <T extends z.ZodTypeAny>(
  itemSchema: T,
): z.ZodObject<{
  data: z.ZodArray<T>;
  total: z.ZodNumber;
}> =>
  z.object({
    data: z.array(itemSchema),
    total: z.number(),
  });

export type ProductHistoryType<T extends z.ZodTypeAny> = z.infer<ReturnType<typeof ProductHistorySchema<T>>>;

// ---------------------------------------------------------------------------
// ProductStatsDTO
// ---------------------------------------------------------------------------

export const ProductStatsSchema = z.object({
  totalProducts: z.number(),
  byCategory: z.array(z.object({ category: z.string(), count: z.number() })),
  byState: z.array(z.object({ state: z.string(), count: z.number() })),
  outstandingCount: z.number(),
  promotedCount: z.number(),
  lastScrapedAt: z.string().nullable(),
  priceRange: z.object({ min: z.number(), max: z.number() }),
});

export type ProductStatsType = z.infer<typeof ProductStatsSchema>;
