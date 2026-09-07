import { z } from 'zod';
import { ALL_CONDITIONS, CONDITION_FIELD } from '../types';

/** Coerces a form string to a number; empty/invalid → undefined (so "optional" works). */
const optionalNumber = z.preprocess((v) => {
  if (v === '' || v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}, z.number().optional());

/**
 * Alarm create/edit form. The numeric field required depends on the selected
 * condition (threshold / percentage / none, see CONDITION_FIELD). Error
 * messages are namespace-qualified i18n keys (`common:...` / `alarms:...`)
 * so they resolve correctly regardless of which namespace the form
 * component's useTranslation() call defaults to.
 */
export const alarmFormSchema = z
  .object({
    productUrl: z
      .string()
      .trim()
      .min(1, 'common:validation.required')
      .url('alarms:form.urlInvalid'),
    name: z.string().trim().min(1, 'common:validation.required'),
    condition: z.enum(ALL_CONDITIONS),
    threshold: optionalNumber,
    percentage: optionalNumber,
    enabled: z.boolean(),
  })
  .superRefine((v, ctx) => {
    const field = CONDITION_FIELD[v.condition];
    if (field === 'threshold' && (v.threshold == null || v.threshold <= 0)) {
      ctx.addIssue({ code: 'custom', path: ['threshold'], message: 'common:validation.required' });
    }
    if (field === 'percentage') {
      if (v.percentage == null) {
        ctx.addIssue({
          code: 'custom',
          path: ['percentage'],
          message: 'common:validation.required',
        });
      } else if (v.percentage < 0 || v.percentage > 100) {
        ctx.addIssue({ code: 'custom', path: ['percentage'], message: 'alarms:form.percentRange' });
      }
    }
  });

export type AlarmFormValues = z.infer<typeof alarmFormSchema>;
