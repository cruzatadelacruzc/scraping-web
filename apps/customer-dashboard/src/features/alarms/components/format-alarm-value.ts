import { CONDITION_FIELD, type AlarmViewModel } from '../types';

/** Formats an alarm's numeric config value for display, per its condition's field type. */
export function formatAlarmValue(
  a: Pick<AlarmViewModel, 'condition' | 'threshold' | 'percentage'>
): string {
  const field = CONDITION_FIELD[a.condition];
  if (field === 'percentage') return `${a.percentage ?? 0}%`;
  if (field === 'threshold')
    return a.condition === 'VIEWS_EXCEED' ? `${a.threshold}` : `$${a.threshold}`;
  return '—';
}
