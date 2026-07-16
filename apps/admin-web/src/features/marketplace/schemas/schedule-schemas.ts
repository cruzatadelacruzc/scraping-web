import { z } from 'zod';

/**
 * Per-field cron atom pattern.
 * Accepts wildcard, numbers, ranges (N-M), steps (star-slash-N or N/S),
 * lists (N,M), and combinations. Also accepts 3-letter named
 * month/weekday abbreviations (JAN, FEB, MON, etc.).
 */
const CRON_ATOM = /^(\*|[0-9]+(-[0-9]+)?(\/[0-9]+)?)([,/][0-9]+(-[0-9]+)?)*$/;

/**
 * Validates that a single cron field is a valid atom.
 * Accepts *, numbers, ranges, steps, lists, and named months/days.
 */
function isValidCronField(field: string): boolean {
  if (field === '*') return true;
  // Allow named 3-letter abbreviations for month/weekday
  if (/^[A-Za-z]{3}(-[A-Za-z]{3})?$/.test(field)) return true;
  return CRON_ATOM.test(field);
}

/**
 * Validates a complete 5-field cron expression.
 * Each field must be a valid cron atom.
 */
function isValidCronExpression(expr: string): boolean {
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) return false;
  return fields.every(isValidCronField);
}

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
  cron: z.string().min(1, 'Cron expression is required').refine(isValidCronExpression, {
    message:
      'Invalid cron expression (expected 5 fields: minute hour day month weekday; accept *, N, N-M, */N, N/M, N,M)',
  }),
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
