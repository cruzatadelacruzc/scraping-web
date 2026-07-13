import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGetAccounts } from '../hooks/useGetAccounts';

export function AccountsTable(): JSX.Element {
  const { t } = useTranslation();
  const [page] = useState(1);
  const { data, isLoading, error } = useGetAccounts({ page, limit: 20 });

  if (isLoading) {
    return (
      <div className="space-y-sm" data-testid="table-skeleton">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 animate-pulse rounded-md bg-surface-container-high" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-danger bg-danger-muted p-md text-sm text-danger">
        {t('common.error')}
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="py-xl text-center">
        <p className="text-lg font-semibold text-on-surface">{t('nav.accounts')}</p>
        <p className="mt-sm text-body-md text-on-surface-variant">No accounts found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-outline-variant">
      <table className="w-full" aria-label={t('nav.accounts')}>
        <caption className="sr-only">{t('nav.accounts')}</caption>
        <thead>
          <tr className="border-b border-outline-variant bg-surface text-left">
            <th className="px-sm py-xs text-label-md font-mono text-on-surface-variant">Name</th>
            <th className="px-sm py-xs text-label-md font-mono text-on-surface-variant">Status</th>
            <th className="px-sm py-xs text-label-md font-mono text-on-surface-variant">Owner</th>
            <th className="px-sm py-xs text-label-md font-mono text-on-surface-variant">Users</th>
            <th className="px-sm py-xs text-label-md font-mono text-on-surface-variant">Plan</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((account) => (
            <tr key={account.id} className="border-b border-outline-variant last:border-0 hover:bg-surface-container-high/50">
              <td className="px-sm py-xs text-body-sm text-on-surface">{account.name}</td>
              <td className="px-sm py-xs">
                <span
                  className={`inline-block rounded-sm px-xs py-0.5 text-label-xs font-mono ${
                    account.statusBadge.variant === 'success'
                      ? 'bg-success-muted text-success'
                      : account.statusBadge.variant === 'warning'
                        ? 'bg-warning-muted text-warning'
                        : 'bg-danger-muted text-danger'
                  }`}
                >
                  {account.statusBadge.label}
                </span>
              </td>
              <td className="px-sm py-xs text-body-sm text-on-surface-variant">{account.ownerEmail}</td>
              <td className="px-sm py-xs text-body-sm text-on-surface tabular-nums">{account.userCount}</td>
              <td className="px-sm py-xs text-body-sm text-on-surface-variant">{account.planName}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
