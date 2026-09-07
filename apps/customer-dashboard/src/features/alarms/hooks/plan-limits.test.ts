import { describe, it, expect } from 'vitest';
import { derivePlanLimits } from './plan-limits';
import type { PlanDTO } from '../types';

const plan = (features: Record<string, unknown>): PlanDTO => ({
  name: 'Test',
  type: 'TEST',
  features,
});

describe('derivePlanLimits', () => {
  it('returns nulls and not-at-limit when there is no active plan', () => {
    const r = derivePlanLimits(null, 5, false);
    expect(r.maxAlarms).toBeNull();
    expect(r.allowedConditions).toBeNull();
    expect(r.used).toBe(5);
    expect(r.atLimit).toBe(false);
    expect(r.isUnlimited).toBe(false);
  });

  it('combines plan features with the current alarm count', () => {
    const r = derivePlanLimits(
      plan({
        maxAlarms: 3,
        allowedConditions: ['PRICE_DROPS_BELOW', 'PRICE_RISES_ABOVE', 'PRICE_CHANGES_BY_PERCENT'],
      }),
      0,
      false
    );
    expect(r.maxAlarms).toBe(3);
    expect(r.used).toBe(0);
    expect(r.atLimit).toBe(false);
    expect(r.allowedConditions).toEqual([
      'PRICE_DROPS_BELOW',
      'PRICE_RISES_ABOVE',
      'PRICE_CHANGES_BY_PERCENT',
    ]);
  });

  it('reports atLimit only when used reaches maxAlarms', () => {
    expect(derivePlanLimits(plan({ maxAlarms: 3 }), 2, false).atLimit).toBe(false);
    expect(derivePlanLimits(plan({ maxAlarms: 3 }), 3, false).atLimit).toBe(true);
    expect(derivePlanLimits(plan({ maxAlarms: 3 }), 4, false).atLimit).toBe(true);
  });

  it('treats maxAlarms -1 as unlimited (never at limit)', () => {
    const r = derivePlanLimits(plan({ maxAlarms: -1 }), 999, false);
    expect(r.isUnlimited).toBe(true);
    expect(r.atLimit).toBe(false);
  });

  it('treats empty or missing allowedConditions as "all allowed" (null)', () => {
    expect(
      derivePlanLimits(plan({ allowedConditions: [] }), 0, false).allowedConditions
    ).toBeNull();
    expect(derivePlanLimits(plan({}), 0, false).allowedConditions).toBeNull();
  });

  it('drops unknown condition strings from allowedConditions', () => {
    const r = derivePlanLimits(
      plan({ allowedConditions: ['PRICE_DROPS_BELOW', 'NONSENSE', 'SELLER_CHANGED'] }),
      0,
      false
    );
    expect(r.allowedConditions).toEqual(['PRICE_DROPS_BELOW', 'SELLER_CHANGED']);
  });

  it('ignores a non-numeric maxAlarms', () => {
    expect(derivePlanLimits(plan({ maxAlarms: 'lots' }), 10, false).maxAlarms).toBeNull();
    expect(derivePlanLimits(plan({ maxAlarms: 'lots' }), 10, false).atLimit).toBe(false);
  });

  it('passes isLoading through unchanged', () => {
    expect(derivePlanLimits(null, 0, true).isLoading).toBe(true);
    expect(derivePlanLimits(null, 0, false).isLoading).toBe(false);
  });
});
