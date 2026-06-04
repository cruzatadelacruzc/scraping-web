import { ValidationError } from '@shared/errors/validation.error';
import { z } from 'zod';
import { AlarmConditionType } from '@prisma/client';

export const UpdateAlarmSchema = z.object({
  name: z.string().min(1).optional(),
  condition: z.nativeEnum(AlarmConditionType).optional(),
  threshold: z.number().positive().optional(),
  percentage: z.number().min(0).max(100).optional(),
  params: z.record(z.unknown()).optional(),
  enabled: z.boolean().optional(),
});

export type UpdateAlarmType = z.infer<typeof UpdateAlarmSchema>;

export class UpdateAlarmDTO {
  public constructor(
    public readonly name?: string,
    public readonly condition?: AlarmConditionType,
    public readonly threshold?: number,
    public readonly percentage?: number,
    public readonly params?: Record<string, unknown>,
    public readonly enabled?: boolean,
  ) {}

  public static from(data: Partial<UpdateAlarmType>): UpdateAlarmDTO {
    try {
      const parsed = UpdateAlarmSchema.parse(data);
      return new UpdateAlarmDTO(parsed.name, parsed.condition, parsed.threshold, parsed.percentage, parsed.params, parsed.enabled);
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw new ValidationError(err.issues.map(({ code, message, path }) => ({ code, message, path })));
      }
      throw err;
    }
  }
}
