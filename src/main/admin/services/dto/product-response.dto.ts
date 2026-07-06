import { z } from 'zod';

// ---------------------------------------------------------------------------
// ProductListItemDTO — lightweight, no history arrays
// ---------------------------------------------------------------------------

export const ProductListItemSchema = z.object({
  _id: z.string(),
  ID: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  url: z.string(),
  description: z.string().optional(),
  cost: z.string().optional(),
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
  metadata: z
    .object({
      scrapedAt: z.unknown().optional(),
    })
    .optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ProductListItemType = z.infer<typeof ProductListItemSchema>;

export class ProductListItemDTO {
  public readonly _id: string;
  public readonly ID?: string;
  public readonly category?: string;
  public readonly subcategory?: string;
  public readonly url: string;
  public readonly description?: string;
  public readonly cost?: string;
  public readonly currency: string;
  public readonly price: number;
  public readonly imageURL?: string;
  public readonly isOutstanding: boolean;
  public readonly isPromoted?: boolean;
  public readonly location?: { state?: string; municipality?: string };
  public readonly views?: number;
  public readonly seller?: { name?: string };
  public readonly metadata?: { scrapedAt?: unknown };
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
    this.metadata = data.metadata;
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
  category: z.string().optional(),
  subcategory: z.string().optional(),
  url: z.string(),
  description: z.string().optional(),
  cost: z.string().optional(),
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
  metadata: z
    .object({
      source: z.string().optional(),
      schemaVersion: z.number().optional(),
      scrapedAt: z.unknown().optional(),
    })
    .optional(),
  tags: z.array(z.string()).optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
  analytics: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ProductDetailType = z.infer<typeof ProductDetailSchema>;

export class ProductDetailDTO {
  public readonly _id: string;
  public readonly ID?: string;
  public readonly category?: string;
  public readonly subcategory?: string;
  public readonly url: string;
  public readonly description?: string;
  public readonly cost?: string;
  public readonly currency: string;
  public readonly price: number;
  public readonly imageURL?: string;
  public readonly isOutstanding: boolean;
  public readonly isPromoted?: boolean;
  public readonly location?: { state?: string; municipality?: string };
  public readonly views?: number;
  public readonly seller?: { name?: string; phone?: string; email?: string; whatsapp?: string };
  public readonly metadata?: { source?: string; schemaVersion?: number; scrapedAt?: unknown };
  public readonly tags?: string[];
  public readonly attributes?: Record<string, unknown>;
  public readonly analytics?: Record<string, unknown>;
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
    this.metadata = data.metadata;
    this.tags = data.tags;
    this.attributes = data.attributes;
    this.analytics = data.analytics;
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
