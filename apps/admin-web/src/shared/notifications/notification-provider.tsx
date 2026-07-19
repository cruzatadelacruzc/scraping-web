/* eslint-disable react-refresh/only-export-components */

import { createContext, type ReactNode, useCallback, useEffect, useMemo, useReducer } from 'react';

import type { AppNotification, NotificationInput } from './notification.types';
import { subscribeToNotifications } from './notification-bus';

const MAX_NOTIFICATIONS = 50;

interface NotificationState {
  notifications: AppNotification[];
}

type NotificationAction =
  | { type: 'add'; notification: AppNotification }
  | { type: 'markRead'; id: string }
  | { type: 'markAllRead' }
  | { type: 'clearAll' };

function notificationReducer(
  state: NotificationState,
  action: NotificationAction,
): NotificationState {
  switch (action.type) {
    case 'add':
      return {
        notifications: [action.notification, ...state.notifications].slice(0, MAX_NOTIFICATIONS),
      };
    case 'markRead':
      return {
        notifications: state.notifications.map((n) =>
          n.id === action.id ? { ...n, read: true } : n,
        ),
      };
    case 'markAllRead':
      return { notifications: state.notifications.map((n) => (n.read ? n : { ...n, read: true })) };
    case 'clearAll':
      return { notifications: [] };
  }
}

export interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  notify: (input: NotificationInput) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
}

export const NotificationContext = createContext<NotificationContextValue | null>(null);

/**
 * In-memory Notification Center state. Session-scoped by design: tokens are
 * in-memory too, so a page refresh already forces a re-login — persisting
 * read-state would outlive the session it belongs to.
 */
export function NotificationProvider({ children }: { children: ReactNode }): JSX.Element {
  const [state, dispatch] = useReducer(notificationReducer, { notifications: [] });

  const notify = useCallback((input: NotificationInput) => {
    dispatch({
      type: 'add',
      notification: {
        id: crypto.randomUUID(),
        title: input.title,
        description: input.description,
        severity: input.severity ?? 'info',
        createdAt: new Date(),
        read: false,
        link: input.link,
      },
    });
  }, []);

  const markRead = useCallback((id: string) => {
    dispatch({ type: 'markRead', id });
  }, []);

  const markAllRead = useCallback(() => {
    dispatch({ type: 'markAllRead' });
  }, []);

  const clearAll = useCallback(() => {
    dispatch({ type: 'clearAll' });
  }, []);

  // Bridge: anything published on the module bus lands in this provider
  useEffect(() => subscribeToNotifications(notify), [notify]);

  const unreadCount = useMemo(
    () => state.notifications.filter((n) => !n.read).length,
    [state.notifications],
  );

  const value = useMemo(
    () => ({
      notifications: state.notifications,
      unreadCount,
      notify,
      markRead,
      markAllRead,
      clearAll,
    }),
    [state.notifications, unreadCount, notify, markRead, markAllRead, clearAll],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}
