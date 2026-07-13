import { useState } from 'react';
import { useGetAccounts } from '../hooks/useGetAccounts';

export function AccountsTable(): JSX.Element {
  const [page] = useState(1);
  const [search] = useState('');
  const { data, isLoading, isError } = useGetAccounts({ page, limit: 20, search });

  if (isLoading) {
    return (
      <div className="space-y-sm">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 animate-pulse rounded-sm bg-surface-container-high" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-md border border-danger bg-danger-muted p-md text-sm text-danger">
        Failed to load accounts. Please try again.
      </div>
    );
  }

  if (data.items.length === 0) {
    return (
      <div className="py-xl text-center">
        <p className="text-lg font-semibold text-on-surface">No accounts found</p>
        <p className="mt-sm text-body-sm text-on-surface-variant">Accounts will appear here once tenants sign up.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-body-sm">
        <caption className="sr-only">Accounts list</caption>
        <thead>
          <tr className="border-b border-outline-variant text-left text-label-xs font-mono uppercase text-on-surface-variant">
            <th className="p-sm">Name</th>
            <th className="p-sm">Status</th>
            <th className="p-sm">Owner</th>
            <th className="p-sm">Users</th>
            <th className="p-sm">Plan</th>
            <th className="p-sm">Created</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((account) => (
            <tr key={account.id} className="border-b border-outline-variant hover:bg-surface-container-high">
              <td className="p-sm text-on-surface">{account.name}</td>
              <td className="p-sm">
                <span className={`rounded-sm px-xs py-0.5 text-label-xs font-mono ${
                  account.status === 'active' ? 'bg-success/15 text-success' :
                  account.status === 'suspended' ? 'bg-warning/15 text-warning' :
                  'bg-danger/15 text-danger'
                }`}>
                  {account.status}
                </span>
              </td>
              <td className="p-sm text-on-surface-variant">{account.ownerEmail}</td>
              <td className="p-sm font-mono text-on-surface-variant">{account.userCount}</td>
              <td className="p-sm text-on-surface-variant">{account.planName}</td>
              <td className="p-sm font-mono text-on-surface-variant">
                {account.createdAt.toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
