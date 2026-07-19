import type { NotificationInput } from './notification.types';

type NotificationListener = (input: NotificationInput) => void;

// Module-level pub/sub so non-React code (e.g. the TanStack MutationCache)
// can push notifications without access to the React context. This is UI
// plumbing, not tenant data — module scope is acceptable here.
const listeners = new Set<NotificationListener>();

/**
 * Publishes a notification to every subscribed listener.
 * No-op when no NotificationProvider is mounted.
 * @param input - Notification content.
 */
export function publishNotification(input: NotificationInput): void {
  listeners.forEach((listener) => {
    listener(input);
  });
}

/**
 * Subscribes a listener to published notifications.
 * @param listener - Callback invoked for each published notification.
 * @returns Unsubscribe function.
 */
export function subscribeToNotifications(listener: NotificationListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
