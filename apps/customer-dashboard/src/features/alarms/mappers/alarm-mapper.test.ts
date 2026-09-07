import { describe, it, expect } from 'vitest';
import { toAlarmViewModel } from './alarm-mapper';
import type { AlarmDTO } from '../types';

const dto: AlarmDTO = {
  id: 'a1',
  accountId: 'acc1',
  productUrl: 'https://r/x',
  name: 'iPhone barato',
  condition: 'PRICE_DROPS_BELOW',
  threshold: 400,
  percentage: null,
  params: null,
  enabled: true,
  lastEvaluatedAt: '2026-07-01T10:00:00.000Z',
  lastEvaluatedPrice: 450,
  lastMatchedAt: null,
  lastNotifiedAt: null,
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-07-01T10:00:00.000Z',
};

describe('toAlarmViewModel', () => {
  it('parses ISO dates to Date and keeps nulls', () => {
    const vm = toAlarmViewModel(dto);
    expect(vm.lastEvaluatedAt).toBeInstanceOf(Date);
    expect(vm.lastMatchedAt).toBeNull();
    expect(vm.createdAt.getFullYear()).toBe(2026);
    expect(vm.condition).toBe('PRICE_DROPS_BELOW');
    expect(vm.enabled).toBe(true);
  });
});
