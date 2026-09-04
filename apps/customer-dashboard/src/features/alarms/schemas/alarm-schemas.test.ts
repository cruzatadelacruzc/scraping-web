import { describe, it, expect } from 'vitest';
import { alarmFormSchema } from './alarm-schemas';

const base = { productUrl: 'https://revolico.com/item/a', name: 'A', enabled: true };

describe('alarmFormSchema', () => {
  it('requires a threshold for PRICE_DROPS_BELOW', () => {
    const r = alarmFormSchema.safeParse({ ...base, condition: 'PRICE_DROPS_BELOW' });
    expect(r.success).toBe(false);
  });

  it('accepts a valid price alarm', () => {
    const r = alarmFormSchema.safeParse({ ...base, condition: 'PRICE_DROPS_BELOW', threshold: 300 });
    expect(r.success).toBe(true);
  });

  it('requires a threshold for VIEWS_EXCEED', () => {
    const r = alarmFormSchema.safeParse({ ...base, condition: 'VIEWS_EXCEED' });
    expect(r.success).toBe(false);
  });

  it('requires a percentage for PRICE_CHANGES_BY_PERCENT', () => {
    expect(
      alarmFormSchema.safeParse({ ...base, condition: 'PRICE_CHANGES_BY_PERCENT' }).success,
    ).toBe(false);
    expect(
      alarmFormSchema.safeParse({ ...base, condition: 'PRICE_CHANGES_BY_PERCENT', percentage: 20 })
        .success,
    ).toBe(true);
  });

  it('rejects a percentage outside 0-100', () => {
    const r = alarmFormSchema.safeParse({
      ...base,
      condition: 'PRICE_CHANGES_BY_PERCENT',
      percentage: 150,
    });
    expect(r.success).toBe(false);
  });

  it('needs no numeric field for IS_OUTSTANDING / SELLER_CHANGED', () => {
    expect(alarmFormSchema.safeParse({ ...base, condition: 'IS_OUTSTANDING' }).success).toBe(true);
    expect(alarmFormSchema.safeParse({ ...base, condition: 'SELLER_CHANGED' }).success).toBe(true);
  });

  it('rejects an invalid product URL', () => {
    const r = alarmFormSchema.safeParse({
      ...base,
      productUrl: 'not-a-url',
      condition: 'IS_OUTSTANDING',
    });
    expect(r.success).toBe(false);
  });

  it('rejects an empty name', () => {
    const r = alarmFormSchema.safeParse({ ...base, name: '  ', condition: 'IS_OUTSTANDING' });
    expect(r.success).toBe(false);
  });
});
