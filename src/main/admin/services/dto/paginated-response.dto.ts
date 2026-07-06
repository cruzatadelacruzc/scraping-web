import { z } from 'zod';

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(
  itemSchema: T,
): z.ZodObject<{
  data: z.ZodArray<T>;
  meta: z.ZodObject<{
    total: z.ZodNumber;
    skip: z.ZodNumber;
    limit: z.ZodNumber;
    hasMore: z.ZodBoolean;
  }>;
}> =>
  z.object({
    data: z.array(itemSchema),
    meta: z.object({
      total: z.number(),
      skip: z.number(),
      limit: z.number(),
      hasMore: z.boolean(),
    }),
  });

export type PaginatedResponseType<T extends z.ZodTypeAny> = z.infer<ReturnType<typeof PaginatedResponseSchema<T>>>;
