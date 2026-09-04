import { UpdateAlarmSchema } from '@alarms/dto/update-alarm.dto';

describe('UpdateAlarmSchema', () => {
  it('accepts a positive threshold', () => {
    expect(UpdateAlarmSchema.safeParse({ threshold: 300 }).success).toBe(true);
  });

  it('accepts a zero threshold', () => {
    expect(UpdateAlarmSchema.safeParse({ threshold: 0 }).success).toBe(true);
  });

  it('rejects a negative threshold', () => {
    expect(UpdateAlarmSchema.safeParse({ threshold: -1 }).success).toBe(false);
  });

  it('allows omitting threshold entirely', () => {
    expect(UpdateAlarmSchema.safeParse({ enabled: false }).success).toBe(true);
  });
});
