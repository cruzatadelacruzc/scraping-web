import type { NotificationDTO } from '../../types';

/** One trigger-history row, ready for rendering (date parsed). */
export interface TimelineEntry {
  id: string;
  title: string;
  message: string;
  createdAt: Date;
}

/**
 * Trigger history for a single alarm: keeps only that alarm's notifications and
 * orders them newest-first. Pure — no React, no i18n (testable without a render).
 */
export function selectAlarmTimeline(
  notifications: NotificationDTO[] | undefined,
  alarmId: string
): TimelineEntry[] {
  return (notifications ?? [])
    .filter((n) => n.alarmId === alarmId)
    .map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      createdAt: new Date(n.createdAt),
    }))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
