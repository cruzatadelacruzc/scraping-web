import { describe, it, expect } from 'vitest';
import type { AlarmViewModel } from '../types';
import { alarmToFormValues, formValuesToInput } from './alarm-form-values';

function makeAlarm(overrides: Partial<AlarmViewModel> = {}): AlarmViewModel {
  return {
    id: '1',
    accountId: 'acc1',
    productUrl: 'https://revolico.com/item/a',
    name: 'iPhone watch',
    condition: 'PRICE_DROPS_BELOW',
    threshold: 300,
    percentage: null,
    params: null,
    enabled: true,
    lastEvaluatedAt: null,
    lastEvaluatedPrice: null,
    lastMatchedAt: null,
    lastNotifiedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('alarmToFormValues', () => {
  it('returns create-mode defaults when no alarm is given', () => {
    expect(alarmToFormValues(undefined)).toEqual({
      productUrl: '',
      name: '',
      condition: 'PRICE_DROPS_BELOW',
      threshold: undefined,
      percentage: undefined,
      enabled: true,
    });
  });

  it('copies threshold for a threshold-field condition, leaves percentage unset', () => {
    const v = alarmToFormValues(makeAlarm({ condition: 'PRICE_DROPS_BELOW', threshold: 300 }));
    expect(v.threshold).toBe(300);
    expect(v.percentage).toBeUndefined();
  });

  it('copies percentage for a percentage-field condition, leaves threshold unset', () => {
    const v = alarmToFormValues(
      makeAlarm({ condition: 'PRICE_CHANGES_BY_PERCENT', threshold: 0, percentage: 15 })
    );
    expect(v.percentage).toBe(15);
    expect(v.threshold).toBeUndefined();
  });

  it('leaves both unset for a no-field condition', () => {
    const v = alarmToFormValues(makeAlarm({ condition: 'IS_OUTSTANDING', threshold: 0 }));
    expect(v.threshold).toBeUndefined();
    expect(v.percentage).toBeUndefined();
  });
});

describe('formValuesToInput', () => {
  it('passes a threshold value through', () => {
    const input = formValuesToInput({
      productUrl: 'https://r/x',
      name: 'A',
      condition: 'PRICE_DROPS_BELOW',
      threshold: 300,
      percentage: undefined,
      enabled: true,
    });
    expect(input.threshold).toBe(300);
    expect(input.percentage).toBeUndefined();
  });

  it('defaults a missing threshold to 0 for a no-field condition', () => {
    const input = formValuesToInput({
      productUrl: 'https://r/x',
      name: 'A',
      condition: 'IS_OUTSTANDING',
      threshold: undefined,
      percentage: undefined,
      enabled: true,
    });
    expect(input.threshold).toBe(0);
  });
});
