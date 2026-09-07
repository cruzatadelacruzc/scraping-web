import { useQuery } from '@tanstack/react-query';
import { notificationsService } from '../services/notifications-service';
import { notificationKeys } from './query-keys';

/**
 * All notifications for the current account. Phase 2 only reads them (alarm
 * detail timeline); Phase 3 will add read/unread mutations against the same key.
 */
export function useNotifications() {
  return useQuery({
    queryKey: notificationKeys.list,
    queryFn: ({ signal }) => notificationsService.list(signal),
  });
}
