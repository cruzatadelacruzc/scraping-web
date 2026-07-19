import i18n from '@shared/i18n/i18n';
import { publishNotification } from '@shared/notifications';
import { MutationCache, QueryClient } from '@tanstack/react-query';

/**
 * Builds the app-wide QueryClient.
 *
 * Every mutation error is also pushed to the Notification Center via the
 * notification bus, so failures stay visible after their toast disappears.
 * Per-hook onError handlers (retry toasts) keep working — both fire.
 * @returns Configured QueryClient instance.
 */
export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    mutationCache: new MutationCache({
      onError: (error) => {
        publishNotification({
          title: i18n.t('notifications.mutationFailedTitle'),
          description: error instanceof Error ? error.message : String(error),
          severity: 'error',
        });
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
      },
    },
  });
}
