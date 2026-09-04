import { describe, it, expect } from 'vitest';
import { formatAlarmValue } from './format-alarm-value';

describe('formatAlarmValue', () => {
  it('formats a price-threshold condition with a currency sign', () => {
    expect(formatAlarmValue({ condition: 'PRICE_DROPS_BELOW', threshold: 300, percentage: null })).toBe(
      '$300',
    );
  });

  it('formats PRICE_RISES_ABOVE the same way as PRICE_DROPS_BELOW', () => {
    expect(formatAlarmValue({ condition: 'PRICE_RISES_ABOVE', threshold: 450, percentage: null })).toBe(
      '$450',
    );
  });

  it('formats VIEWS_EXCEED without a currency sign', () => {
    expect(formatAlarmValue({ condition: 'VIEWS_EXCEED', threshold: 500, percentage: null })).toBe('500');
  });

  it('formats a percentage condition with a % sign', () => {
    expect(
      formatAlarmValue({ condition: 'PRICE_CHANGES_BY_PERCENT', threshold: 0, percentage: 15 }),
    ).toBe('15%');
  });

  it('defaults an unset percentage to 0%', () => {
    expect(
      formatAlarmValue({ condition: 'PRICE_CHANGES_BY_PERCENT', threshold: 0, percentage: null }),
    ).toBe('0%');
  });

  it('shows a dash for conditions with no numeric field', () => {
    expect(formatAlarmValue({ condition: 'IS_OUTSTANDING', threshold: 0, percentage: null })).toBe('—');
    expect(formatAlarmValue({ condition: 'SELLER_CHANGED', threshold: 0, percentage: null })).toBe('—');
  });
});
