import { useTranslation } from 'react-i18next';
import { Drawer } from '@shared/ui/drawer';

import { useGetPlanSubscribers } from '../hooks/useGetPlanSubscribers';

interface PlanSubscribersDrawerProps {
  planId: string | null;
  onClose: () => void;
}

/**
 * Right drawer that displays all accounts subscribed to a given plan.
 *
 * Fetches subscriber data via `useGetPlanSubscribers` and renders a compact
 * table with account name, user count, status, and subscription period.
 */
export function PlanSubscribersDrawer({
  planId,
  onClose,
}: PlanSubscribersDrawerProps): JSX.Element {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useGetPlanSubscribers(planId);

  return (
    <Drawer
      open={planId !== null}
      title={t('plans.subscribers.title', { planName: '' })}
      onClose={onClose}
    >
      {/* Loading */}
      {isLoading && (
        <div className="space-y-sm">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-6 animate-pulse rounded-sm bg-surface-container-highest" />
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="rounded-md border border-danger bg-danger-muted p-md text-sm text-danger">
          {t('common.error')}
        </div>
      )}

      {/* Data */}
      {data && data.length === 0 && (
        <div className="py-lg text-center">
          <p className="text-body-sm text-on-surface-variant">{t('plans.subscribers.empty')}</p>
        </div>
      )}

      {data && data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-body-sm">
            <caption className="sr-only">{t('plans.subscribers.title', { planName: '' })}</caption>
            <thead>
              <tr className="border-b border-outline-variant text-left text-label-xs font-mono uppercase text-on-surface-variant">
                <th className="p-sm">{t('plans.subscribers.table.account')}</th>
                <th className="p-sm">{t('plans.subscribers.table.users')}</th>
                <th className="p-sm">{t('plans.subscribers.table.status')}</th>
                <th className="p-sm">{t('plans.subscribers.table.started')}</th>
                <th className="p-sm">{t('plans.subscribers.table.ends')}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((sub) => (
                <tr
                  key={sub.accountId}
                  className="border-b border-outline-variant last:border-b-0 hover:bg-surface-container-low"
                >
                  <td className="p-sm font-medium text-on-surface">{sub.accountName}</td>
                  <td className="p-sm font-mono text-on-surface-variant">{sub.userCount}</td>
                  <td className="p-sm">
                    <span
                      className={`inline-block rounded-sm px-1.5 py-0.5 text-body-xs ${
                        sub.status === 'ACTIVE' || sub.status === 'TRIALING'
                          ? 'bg-success-muted text-success'
                          : sub.status === 'PAST_DUE'
                            ? 'bg-warning-muted text-warning'
                            : 'bg-surface-container-high text-on-surface-variant'
                      }`}
                    >
                      {sub.status}
                    </span>
                  </td>
                  <td className="p-sm font-mono text-body-xs text-on-surface-variant">
                    {formatDate(sub.periodStart)}
                  </td>
                  <td className="p-sm font-mono text-body-xs text-on-surface-variant">
                    {formatDate(sub.periodEnd)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Drawer>
  );
}

/** Format an ISO date string to a short locale date */
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}
