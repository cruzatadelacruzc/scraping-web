import { z } from 'zod';

export const ProductCatalogItemSchema = z.object({
  id: z.string(),
  url: z.string(),
  description: z.string().optional(),
  price: z.number(),
  currency: z.string(),
  imageURL: z.string().optional(),
  isOutstanding: z.boolean(),
  views: z.number().optional(),
  location: z.object({ state: z.string().optional(), municipality: z.string().optional() }).optional(),
  seller: z.object({ name: z.string().optional() }).optional(),
  category: z.string(),
  subcategory: z.string().optional(),
  updatedAt: z.string(),
});

export type ProductCatalogItemType = z.infer<typeof ProductCatalogItemSchema>;

export const ProductCategoryGroupSchema = z.object({
  category: z.string(),
  subcategories: z.array(z.string()),
});

export type ProductCategoryGroupType = z.infer<typeof ProductCategoryGroupSchema>;
