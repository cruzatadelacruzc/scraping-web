import { useTranslation } from 'react-i18next';
import { Drawer } from '@shared/ui/drawer';

import { useGetAccount } from '../hooks/useGetAccount';

interface Props {
  accountId: string | null;
  onClose: () => void;
}

export function AccountDetailDrawer({ accountId, onClose }: Props): JSX.Element {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useGetAccount(accountId);

  return (
    <Drawer open={accountId !== null} title={t('accounts.drawer.title')} onClose={onClose}>
      {isLoading && (
        <div className="space-y-sm">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-6 animate-pulse rounded-sm bg-surface-container-highest" />
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-md border border-danger bg-danger-muted p-md text-sm text-danger">
          {t('accounts.drawer.error')}
        </div>
      )}

      {data && (
        <dl className="space-y-md">
          <div>
            <dt className="text-label-xs font-mono text-on-surface-variant">
              {t('accounts.drawer.name')}
            </dt>
            <dd className="mt-xs text-body-md text-on-surface">{data.name}</dd>
          </div>
          <div>
            <dt className="text-label-xs font-mono text-on-surface-variant">
              {t('accounts.drawer.accountId')}
            </dt>
            <dd className="mt-xs font-mono text-body-sm text-on-surface-variant">{data.id}</dd>
          </div>
          <div className="grid grid-cols-2 gap-md">
            <div>
              <dt className="text-label-xs font-mono text-on-surface-variant">
                {t('accounts.drawer.users')}
              </dt>
              <dd className="mt-xs text-body-md text-on-surface">{data.userCount}</dd>
            </div>
            <div>
              <dt className="text-label-xs font-mono text-on-surface-variant">
                {t('accounts.drawer.subscriptions')}
              </dt>
              <dd className="mt-xs text-body-md text-on-surface">{data.subscriptionCount}</dd>
            </div>
            <div>
              <dt className="text-label-xs font-mono text-on-surface-variant">
                {t('accounts.drawer.alarms')}
              </dt>
              <dd className="mt-xs text-body-md text-on-surface">{data.alarmCount}</dd>
            </div>
            <div>
              <dt className="text-label-xs font-mono text-on-surface-variant">
                {t('accounts.drawer.created')}
              </dt>
              <dd className="mt-xs text-body-md text-on-surface">
                {data.createdAt.toLocaleDateString()}
              </dd>
            </div>
          </div>
        </dl>
      )}
    </Drawer>
  );
}
