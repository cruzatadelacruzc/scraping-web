import { describe, it, expect } from 'vitest';
import type { NotificationDTO } from '../../types';
import { selectAlarmTimeline } from './notification-timeline';

function notif(overrides: Partial<NotificationDTO>): NotificationDTO {
  return {
    id: 'n',
    alarmId: 'a1',
    type: 'ALARM_TRIGGERED',
    title: 'Title',
    message: 'Message',
    readAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('selectAlarmTimeline', () => {
  it('returns an empty array for undefined input', () => {
    expect(selectAlarmTimeline(undefined, 'a1')).toEqual([]);
  });

  it('keeps only notifications for the given alarm', () => {
    const list = [
      notif({ id: 'n1', alarmId: 'a1' }),
      notif({ id: 'n2', alarmId: 'a2' }),
      notif({ id: 'n3', alarmId: null }),
    ];
    expect(selectAlarmTimeline(list, 'a1').map((e) => e.id)).toEqual(['n1']);
  });

  it('orders entries newest-first and parses the date', () => {
    const list = [
      notif({ id: 'old', createdAt: '2026-01-01T00:00:00.000Z' }),
      notif({ id: 'new', createdAt: '2026-03-01T00:00:00.000Z' }),
      notif({ id: 'mid', createdAt: '2026-02-01T00:00:00.000Z' }),
    ];
    const entries = selectAlarmTimeline(list, 'a1');
    expect(entries.map((e) => e.id)).toEqual(['new', 'mid', 'old']);
    expect(entries[0].createdAt).toBeInstanceOf(Date);
    expect(entries[0].createdAt.toISOString()).toBe('2026-03-01T00:00:00.000Z');
  });

  it('carries title and message through untouched', () => {
    const [entry] = selectAlarmTimeline(
      [notif({ title: 'Precio bajó', message: 'Ahora 180' })],
      'a1'
    );
    expect(entry).toMatchObject({ title: 'Precio bajó', message: 'Ahora 180' });
  });
});
