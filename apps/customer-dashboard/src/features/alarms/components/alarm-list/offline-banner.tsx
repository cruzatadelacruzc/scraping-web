import { useTranslation } from 'react-i18next';
import { CloudOff } from 'lucide-react';
import { useOnlineStatus } from '@/shared/utils/use-online-status';

/**
 * Shown above the alarms list while the browser is offline. The list keeps
 * rendering the last cache persisted to IndexedDB (see `query-persister`).
 */
export function OfflineBanner() {
  const { t } = useTranslation('common');
  if (useOnlineStatus()) return null;

  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning"
    >
      <CloudOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      {t('offline.banner')}
    </div>
  );
}
