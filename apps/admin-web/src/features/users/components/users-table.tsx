import { useState } from 'react';
import { useGetUsers } from '../hooks/useGetUsers';

const PAGE_SIZE = 20;

export function UsersTable(): JSX.Element {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error } = useGetUsers({ page, limit: PAGE_SIZE });
  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  if (isLoading) {
    return (
      <div className="space-y-sm">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-9 animate-pulse rounded-sm bg-surface-container-high" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-md border border-danger bg-danger-muted p-md text-sm text-danger">
        {error instanceof Error ? error.message : 'Failed to load users.'}
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="py-xl text-center">
        <p className="text-lg font-semibold text-on-surface">No users found</p>
        <p className="mt-sm text-body-sm text-on-surface-variant">Users will appear here.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-outline-variant">
      <div className="overflow-x-auto">
        <table className="w-full text-body-sm">
          <caption className="sr-only">Users list</caption>
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container-low text-left text-label-xs font-mono uppercase text-on-surface-variant">
              <th className="p-sm">Username</th>
              <th className="p-sm">Email</th>
              <th className="p-sm">Roles</th>
              <th className="p-sm">Verified</th>
              <th className="p-sm">Created</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((user) => (
              <tr key={user.id} className="border-b border-outline-variant transition-colors hover:bg-surface-container-high">
                <td className="p-sm font-medium text-on-surface">{user.displayName}</td>
                <td className="p-sm text-on-surface-variant">{user.email}</td>
                <td className="p-sm">
                  <div className="flex flex-wrap gap-xs">
                    {user.roles.map((role) => (
                      <span key={role} className="rounded-sm bg-primary/10 px-xs py-0.5 text-label-xs font-mono text-primary">
                        {role}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-sm">
                  {user.emailVerified ? (
                    <span className="text-success">Verified</span>
                  ) : (
                    <span className="text-warning">Pending</span>
                  )}
                </td>
                <td className="p-sm font-mono text-on-surface-variant">{user.createdAt.toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-outline-variant px-sm py-sm">
        <span className="text-body-sm text-on-surface-variant">Page {page} of {totalPages} · {data.total} total</span>
        <div className="flex gap-xs">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-sm px-sm py-xs text-body-sm text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30">‹ Prev</button>
          <button onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages} className="rounded-sm px-sm py-xs text-body-sm text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30">Next ›</button>
        </div>
      </div>
    </div>
  );
}
