import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

import { useGetAccount } from '../hooks/useGetAccount';

interface Props {
  accountId: string | null;
  onClose: () => void;
}

export function AccountDetailDrawer({ accountId, onClose }: Props): JSX.Element {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useGetAccount(accountId);
  const isOpen = accountId !== null;

  return (
    <>
      {/* Backdrop */}
      {isOpen && <div className="fixed inset-0 z-40 bg-black/30" role="presentation" onClick={onClose} onKeyDown={onClose} />}

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 z-50 h-full w-96 transform border-l border-outline-variant bg-surface-container-high p-lg shadow-lg transition-transform duration-200 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="mb-lg flex items-center justify-between">
          <h2 className="text-lg font-semibold text-on-surface">{t('accounts.drawer.title')}</h2>
          <button
            onClick={onClose}
            className="rounded-sm p-xs text-on-surface-variant hover:bg-surface-container-highest"
            aria-label={t('accounts.drawer.close')}
          >
            <X size={18} />
          </button>
        </div>

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
              <dt className="text-label-xs font-mono text-on-surface-variant">{t('accounts.drawer.name')}</dt>
              <dd className="mt-xs text-body-md text-on-surface">{data.name}</dd>
            </div>
            <div>
              <dt className="text-label-xs font-mono text-on-surface-variant">{t('accounts.drawer.accountId')}</dt>
              <dd className="mt-xs font-mono text-body-sm text-on-surface-variant">{data.id}</dd>
            </div>
            <div className="grid grid-cols-2 gap-md">
              <div>
                <dt className="text-label-xs font-mono text-on-surface-variant">{t('accounts.drawer.users')}</dt>
                <dd className="mt-xs text-body-md text-on-surface">{data.userCount}</dd>
              </div>
              <div>
                <dt className="text-label-xs font-mono text-on-surface-variant">{t('accounts.drawer.subscriptions')}</dt>
                <dd className="mt-xs text-body-md text-on-surface">{data.subscriptionCount}</dd>
              </div>
              <div>
                <dt className="text-label-xs font-mono text-on-surface-variant">{t('accounts.drawer.alarms')}</dt>
                <dd className="mt-xs text-body-md text-on-surface">{data.alarmCount}</dd>
              </div>
              <div>
                <dt className="text-label-xs font-mono text-on-surface-variant">{t('accounts.drawer.created')}</dt>
                <dd className="mt-xs text-body-md text-on-surface">
                  {data.createdAt.toLocaleDateString()}
                </dd>
              </div>
            </div>
          </dl>
        )}
      </div>
    </>
  );
}
