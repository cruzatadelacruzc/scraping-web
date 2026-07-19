import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useHealthStatus } from '@features/dashboard';
import { useGetQueues } from '@features/queues';
import { ROUTES } from '@shared/config/routes';
import { useNotifications } from '@shared/notifications';

/**
 * Invisible watcher mounted in the authenticated layout. Reuses the health
 * and queue-stats queries (30s refetch) and raises notifications on
 * transitions: service connected→error / error→connected, and failed-job
 * count increases. The first snapshot never notifies.
 */
export function SystemAlertsWatcher(): null {
  const { t } = useTranslation();
  const { notify } = useNotifications();
  const { data: health } = useHealthStatus();
  const { data: queues } = useGetQueues();

  const prevHealthRef = useRef<Record<string, string> | null>(null);
  const prevFailedRef = useRef<Record<string, number> | null>(null);

  useEffect(() => {
    if (!health) return;
    const current: Record<string, string> = {};
    for (const s of health.services) {
      current[s.service] = s.status;
    }
    const prev = prevHealthRef.current;
    if (prev) {
      for (const [service, status] of Object.entries(current)) {
        if (!(service in prev)) continue;
        const before = prev[service];
        if (before === status) continue;
        if (status === 'error') {
          notify({ title: t('notifications.serviceDown', { service }), severity: 'error' });
        } else if (status === 'connected') {
          notify({ title: t('notifications.serviceRecovered', { service }), severity: 'success' });
        }
      }
    }
    prevHealthRef.current = current;
  }, [health, notify, t]);

  useEffect(() => {
    if (!queues) return;
    const current: Record<string, number> = {};
    for (const queue of queues) {
      current[queue.name] = queue.failedCount;
    }
    const prev = prevFailedRef.current;
    if (prev) {
      for (const [name, failed] of Object.entries(current)) {
        const before = prev[name] ?? 0;
        if (failed > before) {
          notify({
            title: t('notifications.jobsFailed', { count: failed - before, queue: name }),
            severity: 'warning',
            link: ROUTES.QUEUES,
          });
        }
      }
    }
    prevFailedRef.current = current;
  }, [queues, notify, t]);

  return null;
}
