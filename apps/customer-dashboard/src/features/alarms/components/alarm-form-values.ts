import { CONDITION_FIELD, type AlarmViewModel, type CreateAlarmInput } from '../types';
import type { AlarmFormValues } from '../schemas/alarm-schemas';

/**
 * Maps an existing alarm (edit) or nothing (create) to the form's default values.
 * On create, `lockedProductUrl` (supplied by the catalog picker wizard) seeds the
 * hidden `productUrl` field so the value is present without a visible input.
 */
export function alarmToFormValues(
  a?: AlarmViewModel | null,
  lockedProductUrl?: string
): AlarmFormValues {
  if (!a) {
    return {
      productUrl: lockedProductUrl ?? '',
      name: '',
      condition: 'PRICE_DROPS_BELOW',
      threshold: undefined,
      percentage: undefined,
      enabled: true,
    };
  }
  const field = CONDITION_FIELD[a.condition];
  return {
    productUrl: a.productUrl,
    name: a.name,
    condition: a.condition,
    threshold: field === 'threshold' ? a.threshold : undefined,
    percentage: field === 'percentage' ? (a.percentage ?? undefined) : undefined,
    enabled: a.enabled,
  };
}

/** Maps validated form values to the API input shape. */
export function formValuesToInput(v: AlarmFormValues): CreateAlarmInput {
  return {
    productUrl: v.productUrl,
    name: v.name,
    condition: v.condition,
    threshold: v.threshold ?? 0,
    percentage: v.percentage,
    enabled: v.enabled,
  };
}
