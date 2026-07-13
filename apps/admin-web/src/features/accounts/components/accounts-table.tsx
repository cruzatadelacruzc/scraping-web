import { useState } from 'react';
import { useGetAccounts } from '../hooks/useGetAccounts';
import { AccountDetailDrawer } from './account-detail-drawer';

const PAGE_SIZE = 20;

export function AccountsTable(): JSX.Element {
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isLoading, isError, error } = useGetAccounts({ page, limit: PAGE_SIZE });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  // 1. Loading
  if (isLoading) {
    return (
      <div className="space-y-sm">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-9 animate-pulse rounded-sm bg-surface-container-high" />
        ))}
      </div>
    );
  }

  // 2. Error
  if (isError) {
    return (
      <div className="rounded-md border border-danger bg-danger-muted p-md text-sm text-danger">
        {error instanceof Error ? error.message : 'Failed to load accounts.'}
      </div>
    );
  }

  // 3. Empty
  if (!data || data.items.length === 0) {
    return (
      <div className="py-xl text-center">
        <p className="text-lg font-semibold text-on-surface">No accounts found</p>
        <p className="mt-sm text-body-sm text-on-surface-variant">Accounts will appear here once tenants sign up.</p>
      </div>
    );
  }

  // 4. Data
  return (
    <div className="rounded-md border border-outline-variant">
      <div className="overflow-x-auto">
        <table className="w-full text-body-sm">
          <caption className="sr-only">Accounts list</caption>
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container-low text-left text-label-xs font-mono uppercase text-on-surface-variant">
              <th className="p-sm">Name</th>
              <th className="p-sm">Users</th>
              <th className="p-sm">Subscriptions</th>
              <th className="p-sm">Alarms</th>
              <th className="p-sm">Created</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((account) => (
              <tr
                key={account.id}
                className="cursor-pointer border-b border-outline-variant transition-colors hover:bg-surface-container-high"
                onClick={() => setSelectedId(account.id)}
              >
                <td className="p-sm font-medium text-on-surface">{account.name}</td>
                <td className="p-sm font-mono text-on-surface-variant">{account.userCount}</td>
                <td className="p-sm font-mono text-on-surface-variant">{account.subscriptionCount}</td>
                <td className="p-sm font-mono text-on-surface-variant">{account.alarmCount}</td>
                <td className="p-sm font-mono text-on-surface-variant">
                  {account.createdAt.toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-outline-variant px-sm py-sm">
        <span className="text-body-sm text-on-surface-variant">
          Page {page} of {totalPages} · {data.total} total
        </span>
        <div className="flex gap-xs">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-sm px-sm py-xs text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-30"
          >
            ‹ Prev
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages}
            className="rounded-sm px-sm py-xs text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-30"
          >
            Next ›
          </button>
        </div>
      </div>

      <AccountDetailDrawer accountId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
