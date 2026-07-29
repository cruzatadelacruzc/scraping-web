import { z } from 'zod';

export const planFeaturesSchema = z.object({
  maxAlarms: z.number().int().min(-1),
  allowedConditions: z.array(z.string()),
  aiAlarms: z.boolean(),
  notificationChannels: z.array(z.string()),
});

export const planFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).default(''),
  price: z.number().min(0),
  features: planFeaturesSchema,
});

export type PlanFormValues = z.infer<typeof planFormSchema>;
