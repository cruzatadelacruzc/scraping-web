import { CreateAlarmSchema } from '@alarms/dto/create-alarm.dto';

describe('CreateAlarmSchema', () => {
  const base = {
    productUrl: 'https://revolico.com/item/a',
    name: 'Test alarm',
    condition: 'PRICE_DROPS_BELOW',
  };

  it('accepts a positive threshold', () => {
    const result = CreateAlarmSchema.safeParse({ ...base, threshold: 300 });
    expect(result.success).toBe(true);
  });

  it('accepts a zero threshold (used for conditions with no numeric field, e.g. IS_OUTSTANDING/SELLER_CHANGED)', () => {
    const result = CreateAlarmSchema.safeParse({
      ...base,
      condition: 'IS_OUTSTANDING',
      threshold: 0,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a negative threshold', () => {
    const result = CreateAlarmSchema.safeParse({ ...base, threshold: -5 });
    expect(result.success).toBe(false);
  });

  it('still requires threshold to be present', () => {
    const result = CreateAlarmSchema.safeParse({ ...base });
    expect(result.success).toBe(false);
  });
});
