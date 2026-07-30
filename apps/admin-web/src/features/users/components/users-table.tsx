import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Permission, useHasPermission } from '@shared/permissions';
import { Search, Shield } from 'lucide-react';

import { useGetUsers } from '../hooks/useGetUsers';

import { ManageRolesDialog } from './manage-roles-dialog';
import { UserDetailDrawer } from './user-detail-drawer';

const PAGE_SIZE = 20;

export function UsersTable(): JSX.Element {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showManageRoles, setShowManageRoles] = useState(false);
  const hasPermission = useHasPermission();
  const canManageRoles = hasPermission(Permission.MANAGE_ROLES);

  const handleCloseDrawer = useCallback(() => {
    setSelectedId(null);
  }, []);

  const handleCloseManageRoles = useCallback(() => {
    setShowManageRoles(false);
  }, []);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 when search changes
    }, 300);
    return () => {
      clearTimeout(timer);
    };
  }, [search]);

  const { data, isLoading, isError, error, isFetching } = useGetUsers({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  const header = (
    <div className="mb-md flex items-center gap-sm">
      <div className="relative flex-1">
        <Search className="absolute left-sm top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
          }}
          placeholder={t('users.searchPlaceholder')}
          className="w-full rounded-sm border border-outline-variant bg-surface py-xs pl-lg pr-sm text-body-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label={t('users.searchPlaceholder')}
        />
      </div>
      {canManageRoles && (
        <button
          onClick={() => {
            setShowManageRoles(true);
          }}
          className="inline-flex shrink-0 items-center gap-xs rounded-sm border border-outline-variant px-sm py-xs text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container-high"
        >
          <Shield size={14} aria-hidden="true" />
          {t('roles.manageButton')}
        </button>
      )}
    </div>
  );

  const manageRolesDialog = (
    <ManageRolesDialog open={showManageRoles} onClose={handleCloseManageRoles} />
  );

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
        {error instanceof Error ? error.message : t('common.error')}
      </div>
    );
  }

  // 3. Empty
  if (!data || data.items.length === 0) {
    return (
      <>
        {header}
        <div className="py-xl text-center">
          <p className="text-lg font-semibold text-on-surface">{t('users.noUsers')}</p>
          <p className="mt-sm text-body-sm text-on-surface-variant">{t('users.noUsersDesc')}</p>
        </div>
        {manageRolesDialog}
      </>
    );
  }

  // 4. Data
  return (
    <>
      {header}

      <div className="rounded-md border border-outline-variant">
        {isFetching && <div className="h-0.5 bg-primary/20 animate-pulse" />}
        <div className="overflow-x-auto">
          <table className="w-full text-body-sm">
            <caption className="sr-only">{t('nav.users')}</caption>
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low text-left text-label-xs font-mono uppercase text-on-surface-variant">
                <th className="p-sm">{t('users.displayName')}</th>
                <th className="p-sm">{t('users.email')}</th>
                <th className="p-sm">{t('users.roles')}</th>
                <th className="p-sm">{t('users.verified')}</th>
                <th className="p-sm">{t('users.createdAt')}</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((user) => (
                <tr
                  key={user.id}
                  className="cursor-pointer border-b border-outline-variant transition-colors hover:bg-surface-container-high"
                  onClick={() => {
                    setSelectedId(user.id);
                  }}
                >
                  <td className="p-sm font-medium text-on-surface">{user.displayName}</td>
                  <td className="p-sm text-on-surface-variant">{user.email}</td>
                  <td className="p-sm">
                    <div className="flex flex-wrap gap-xs">
                      {user.roles.map((role) => (
                        <span
                          key={role}
                          className="rounded-sm bg-primary/10 px-xs py-0.5 text-label-xs font-mono text-primary"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-sm">
                    {user.emailVerified ? (
                      <span className="text-success">{t('users.verifiedYes')}</span>
                    ) : (
                      <span className="text-warning">{t('users.verifiedNo')}</span>
                    )}
                  </td>
                  <td className="p-sm font-mono text-on-surface-variant">
                    {user.createdAt.toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-outline-variant px-sm py-sm">
          <span className="text-body-sm text-on-surface-variant">
            {t('users.pageOf', { page, total: totalPages })} · {data.total} {t('users.total')}
          </span>
          <div className="flex gap-xs">
            <button
              onClick={() => {
                setPage((p) => Math.max(1, p - 1));
              }}
              disabled={page <= 1}
              className="rounded-sm px-sm py-xs text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-30"
            >
              ‹ {t('common.prev')}
            </button>
            <button
              onClick={() => {
                setPage((p) => p + 1);
              }}
              disabled={page >= totalPages}
              className="rounded-sm px-sm py-xs text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-30"
            >
              {t('common.next')} ›
            </button>
          </div>
        </div>
      </div>

      <UserDetailDrawer userId={selectedId} onClose={handleCloseDrawer} />
      {manageRolesDialog}
    </>
  );
}
