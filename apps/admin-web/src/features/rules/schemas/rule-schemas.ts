import { z } from 'zod';

/**
 * Validates that a JSON string parses to string[] where every element is
 * a non-empty string.
 */
function parseValuesJSON(val: string, ctx: z.RefinementCtx): void {
  try {
    const parsed: unknown = JSON.parse(val);
    if (!Array.isArray(parsed)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Must be a JSON array' });
      return;
    }
    if (parsed.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Array must have at least 1 item' });
      return;
    }
    for (let i = 0; i < parsed.length; i++) {
      const item = parsed[i];
      if (typeof item !== 'string' || item.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Item at index ${String(i)} must be a non-empty string`,
        });
        return;
      }
    }
  } catch {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid JSON syntax' });
  }
}

export const createRuleFormSchema = z.object({
  ruleKey: z
    .string()
    .min(1, 'Rule key is required')
    .regex(/^[a-zA-Z][a-zA-Z0-9]*$/, 'Must be alphanumeric (start with a letter)'),
  valuesStr: z.string().min(1, 'Values are required').superRefine(parseValuesJSON),
});

export const updateRuleFormSchema = z.object({
  valuesStr: z.string().min(1, 'Values are required').superRefine(parseValuesJSON),
});

export type CreateRuleFormValues = z.infer<typeof createRuleFormSchema>;
export type UpdateRuleFormValues = z.infer<typeof updateRuleFormSchema>;
