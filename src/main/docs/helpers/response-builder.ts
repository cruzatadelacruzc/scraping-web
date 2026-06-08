import { z } from 'zod';

export function envelope(
  schema: z.ZodTypeAny,
  description: string,
): z.ZodObject<{ status: z.ZodLiteral<string>; message: z.ZodString; data: typeof schema }> {
  return z.object({
    status: z.literal('success'),
    message: z.string().openapi({ example: description }),
    data: schema,
  });
}

export function createdEnvelope(
  schema: z.ZodTypeAny,
  description: string,
): z.ZodObject<{ status: z.ZodLiteral<string>; message: z.ZodString; data: typeof schema }> {
  return z.object({
    status: z.literal('success'),
    message: z.string().openapi({ example: description }),
    data: schema,
  });
}

export function errorSchema(description: string): {
  description: string;
  content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } };
} {
  return {
    description,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ErrorResponse' as const },
      },
    },
  };
}
