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
        // Floor stale time. Hooks raise it per tier: realtime 30s / standard
        // 5min / static 30min (see `apps/admin-web/CLAUDE.md` → State Strategy).
        staleTime: 30_000,
        retry: 1,
        // Admin console: don't refetch every query when the operator alt-tabs
        // back. Freshness is governed by per-tier `staleTime`, not by focus.
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        // Left at the TanStack default. React StrictMode's double mount is
        // already deduped by the in-flight request cache + `staleTime`; setting
        // this to `false` is a no-op for that and only hurts freshness on
        // genuine remounts. Realtime hooks use `refetchInterval` instead.
        refetchOnMount: true,
      },
    },
  });
}
