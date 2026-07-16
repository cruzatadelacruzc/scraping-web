import { z } from 'zod';

/**
 * Basic 5-field cron expression validation.
 * Allows standard cron patterns: `* * * * *` with ranges, steps, lists, and names.
 */
const CRON_REGEX = /^(\S+\s+){4}\S+$/;

/**
 * Zod schema for the scraping schedule form.
 * Used with React Hook Form for create/edit.
 */
export const scheduleFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Schedule name is required')
    .max(100, 'Schedule name must be 100 characters or fewer'),
  store: z.string().min(1, 'Store is required'),
  cron: z
    .string()
    .min(1, 'Cron expression is required')
    .regex(
      CRON_REGEX,
      'Invalid cron expression (expected 5 fields: minute hour day month weekday)',
    ),
  enabled: z.boolean().default(true),
  jobs: z.array(z.record(z.string(), z.unknown())).min(1, 'At least one scraping job is required'),
});

export type ScheduleFormValues = z.infer<typeof scheduleFormSchema>;

/**
 * Preset cron expressions for common schedules.
 */
export const CRON_PRESETS = [
  { label: 'Hourly', value: '0 * * * *' },
  { label: 'Daily', value: '0 0 * * *' },
  { label: 'Weekly', value: '0 0 * * 0' },
  { label: 'Every 30 min', value: '*/30 * * * *' },
] as const;
