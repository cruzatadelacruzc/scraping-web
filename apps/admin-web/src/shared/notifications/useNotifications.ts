import { useContext } from 'react';

import { NotificationContext, type NotificationContextValue } from './notification-provider';

/**
 * Access the Notification Center state and actions.
 * @returns Context value with notifications, unreadCount and actions.
 * @throws Error when rendered outside a NotificationProvider.
 */
export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return ctx;
}
