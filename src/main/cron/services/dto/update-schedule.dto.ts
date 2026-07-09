import { z } from 'zod';
import { ValidationError } from '@shared/errors/validation.error';

export const UpdateScheduleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  store: z.string().min(1).optional(),
  cron: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
  jobs: z.array(z.object({}).passthrough()).min(1, 'At least one scraping job is required').optional(),
});

export type UpdateScheduleType = z.infer<typeof UpdateScheduleSchema>;

/**
 * DTO for updating an existing scraping schedule. All fields are optional
 * — only the provided fields are updated (partial update).
 */
export class UpdateScheduleDTO {
  public readonly name?: string;
  public readonly store?: string;
  public readonly cron?: string;
  public readonly enabled?: boolean;
  public readonly jobs?: Record<string, unknown>[];

  private constructor(data: UpdateScheduleType) {
    Object.assign(this, data);
  }

  /** Parses and validates the request body. */
  public static from(body: unknown): UpdateScheduleDTO {
    try {
      const parsed = UpdateScheduleSchema.parse(body);
      return new UpdateScheduleDTO(parsed);
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw new ValidationError(err.issues.map(({ code, message, path }) => ({ code, message, path })));
      }
      throw err;
    }
  }
}
