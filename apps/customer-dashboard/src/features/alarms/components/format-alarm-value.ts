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

/** A price value from the evaluation status; `—` when the alarm has never been evaluated. */
export function formatPrice(value: number | null): string {
  return value == null ? '—' : `$${value.toFixed(2)}`;
}

/** Locale-aware `dd/mm/yyyy hh:mm`; falls back to `neverLabel` for a null date. */
export function formatDateTime(date: Date | null, neverLabel: string): string {
  if (!date) return neverLabel;
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
