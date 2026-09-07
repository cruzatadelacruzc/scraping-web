import { ValidationError } from '@shared/errors/validation.error';
import { z } from 'zod';
import { AlarmConditionType } from '@prisma/client';

export const CreateAlarmSchema = z.object({
  productUrl: z.string().min(1, 'Product URL is required'),
  name: z.string().min(1, 'Name is required'),
  condition: z.nativeEnum(AlarmConditionType),
  threshold: z.number().min(0, 'Threshold cannot be negative'),
  percentage: z.number().min(0).max(100).optional(),
  params: z.record(z.unknown()).optional(),
  enabled: z.boolean().optional(),
});

export type CreateAlarmType = z.infer<typeof CreateAlarmSchema>;

export class CreateAlarmDTO {
  public constructor(
    public readonly productUrl: string,
    public readonly name: string,
    public readonly condition: AlarmConditionType,
    public readonly threshold: number,
    public readonly percentage?: number,
    public readonly params?: Record<string, unknown>,
    public readonly enabled?: boolean,
  ) {}

  public static from(data: Partial<CreateAlarmType>): CreateAlarmDTO {
    try {
      const parsed = CreateAlarmSchema.parse(data);
      return new CreateAlarmDTO(
        parsed.productUrl,
        parsed.name,
        parsed.condition,
        parsed.threshold,
        parsed.percentage,
        parsed.params,
        parsed.enabled,
      );
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw new ValidationError(err.issues.map(({ code, message, path }) => ({ code, message, path })));
      }
      throw err;
    }
  }
}
