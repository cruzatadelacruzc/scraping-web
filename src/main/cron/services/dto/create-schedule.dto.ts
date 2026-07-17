import { z } from 'zod';
import { ValidationError } from '@shared/errors/validation.error';

export const CreateScheduleSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  store: z.string().min(1, 'Store is required'),
  cron: z.string().min(1, 'Cron expression is required'),
  enabled: z.boolean().optional().default(true),
  jobs: z.array(z.object({}).passthrough()).min(1, 'At least one scraping job is required'),
});

export type CreateScheduleType = z.infer<typeof CreateScheduleSchema>;

/**
 * DTO for creating a new scraping schedule.
 *
 * `jobs` is a store-specific JSON array — each entry is validated as a
 * non-empty object but the fields are opaque to the API layer. The target
 * store module interprets them.
 */
export class CreateScheduleDTO {
  public readonly name: string;
  public readonly store: string;
  public readonly cron: string;
  public readonly enabled: boolean;
  public readonly jobs: Record<string, unknown>[];

  private constructor(data: CreateScheduleType) {
    this.name = data.name;
    this.store = data.store;
    this.cron = data.cron;
    this.enabled = data.enabled;
    this.jobs = data.jobs as Record<string, unknown>[];
  }

  /** Parses and validates the request body. */
  public static from(body: unknown): CreateScheduleDTO {
    try {
      const parsed = CreateScheduleSchema.parse(body);
      return new CreateScheduleDTO(parsed);
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw new ValidationError(err.issues.map(({ code, message, path }) => ({ code, message, path })));
      }
      throw err;
    }
  }
}
