import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrentUser } from '@shared/auth';
import { AlertDialog } from '@shared/ui/alert-dialog';
import { Search, Trash2 } from 'lucide-react';

import { useDeleteAccount } from '../hooks/useDeleteAccount';
import { useGetAccounts } from '../hooks/useGetAccounts';

import { AccountDetailDrawer } from './account-detail-drawer';

const PAGE_SIZE = 20;

export function AccountsTable(): JSX.Element {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const deleteMutation = useDeleteAccount();
  const currentUser = useCurrentUser();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => { clearTimeout(timer); };
  }, [searchInput]);

  const { data, isLoading, isError, error, isFetching } = useGetAccounts({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  // Master checkbox: all selected vs none
  const allVisibleSelected = useMemo(
    () => data !== undefined && data.items.length > 0 && selectedIds.size === data.items.length,
    [data, selectedIds],
  );

  const handleMasterCheckbox = useCallback(() => {
    if (!data) return;
    if (allVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.items.map((a) => a.id)));
    }
  }, [data, allVisibleSelected]);

  const handleRowCheckbox = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget, {
      onSuccess: () => {
        setDeleteTarget(null);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(deleteTarget);
          return next;
        });
      },
    });
  }, [deleteTarget, deleteMutation]);

  const handleCloseDrawer = useCallback(() => {
    setSelectedId(null);
  }, []);

  const handleCancelDelete = useCallback(() => {
    setDeleteTarget(null);
  }, []);

  // 1. Loading
  if (isLoading) {
    return (
      <div className="space-y-sm">
        <div className="h-9 animate-pulse rounded-sm bg-surface-container-high" />
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
        {error instanceof Error ? error.message : t('accounts.error.message')}
      </div>
    );
  }

  // 3. Empty
  if (!data || data.items.length === 0) {
    return (
      <div className="py-xl text-center">
        <p className="text-lg font-semibold text-on-surface">{t('accounts.empty.title')}</p>
        <p className="mt-sm text-body-sm text-on-surface-variant">
          {t('accounts.empty.description')}
        </p>
      </div>
    );
  }

  // 4. Data
  return (
    <div>
      {/* Search input */}
      <div className="relative mb-sm">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
          aria-hidden="true"
        />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => { setSearchInput(e.target.value); }}
          placeholder={t('accounts.searchPlaceholder')}
          aria-label={t('accounts.searchPlaceholder')}
          className="w-full rounded-sm border border-outline-variant bg-surface py-2 pl-9 pr-3 text-body-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="sticky top-0 z-10 mb-sm flex items-center justify-between rounded-sm border border-outline-variant bg-surface-container-high px-md py-sm">
          <span className="text-body-sm font-medium text-on-surface">
            {t('accounts.selected.count', { count: selectedIds.size })}
          </span>
          <button
            disabled
            className="rounded-sm px-sm py-xs text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container-highest disabled:opacity-30"
            aria-label={t('accounts.selected.delete')}
          >
            <Trash2 size={16} className="inline-block align-text-bottom" />
            <span className="ml-xs">{t('accounts.selected.delete')}</span>
          </button>
        </div>
      )}

      <div className="rounded-md border border-outline-variant">
        {/* Background refetch progress */}
        {isFetching && (
          <div className="h-0.5 w-full animate-pulse bg-primary/20" />
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-body-sm">
            <caption className="sr-only">{t('accounts.table.name')}</caption>
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low text-left text-label-xs font-mono uppercase text-on-surface-variant">
                <th className="w-10 p-sm">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={handleMasterCheckbox}
                    aria-label="Select all accounts"
                    className="h-4 w-4 rounded border-outline-variant bg-surface text-primary focus:ring-1 focus:ring-primary"
                  />
                </th>
                <th className="p-sm">{t('accounts.table.name')}</th>
                <th className="p-sm">{t('accounts.table.users')}</th>
                <th className="p-sm">{t('accounts.table.subscriptions')}</th>
                <th className="p-sm">{t('accounts.table.alarms')}</th>
                <th className="p-sm">{t('accounts.table.created')}</th>
                <th className="w-14 p-sm">{t('accounts.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((account) => (
                <tr
                  key={account.id}
                  className="cursor-pointer border-b border-outline-variant transition-colors hover:bg-surface-container-high"
                  onClick={() => { setSelectedId(account.id); }}
                >
                  <td className="p-sm" onClick={(e) => { e.stopPropagation(); }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(account.id)}
                      onChange={() => { handleRowCheckbox(account.id); }}
                      aria-label={`Select ${account.name}`}
                      className="h-4 w-4 rounded border-outline-variant bg-surface text-primary focus:ring-1 focus:ring-primary"
                    />
                  </td>
                  <td className="p-sm font-medium text-on-surface">{account.name}</td>
                  <td className="p-sm font-mono text-on-surface-variant">{account.userCount}</td>
                  <td className="p-sm font-mono text-on-surface-variant">
                    {account.subscriptionCount}
                  </td>
                  <td className="p-sm font-mono text-on-surface-variant">{account.alarmCount}</td>
                  <td className="p-sm font-mono text-on-surface-variant">
                    {account.createdAt.toLocaleDateString()}
                  </td>
                  <td className="p-sm" onClick={(e) => { e.stopPropagation(); }}>
                    {currentUser?.accountId === account.id ? (
                      <button
                        disabled
                        className="cursor-not-allowed rounded-sm p-1 text-on-surface-variant opacity-40"
                        aria-label={t('accounts.cannotDeleteSelf')}
                        title={t('accounts.cannotDeleteSelf')}
                      >
                        <Trash2 size={16} />
                      </button>
                    ) : (
                      <button
                        onClick={() => { setDeleteTarget(account.id); }}
                        className="rounded-sm p-1 text-on-surface-variant transition-colors hover:bg-surface-container-highest hover:text-danger"
                        aria-label={t('accounts.delete.title')}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-outline-variant px-sm py-sm">
          <span className="text-body-sm text-on-surface-variant">
            {t('accounts.pagination.info', {
              page,
              totalPages,
              total: data.total,
            })}
          </span>
          <div className="flex gap-xs">
            <button
              onClick={() => { setPage((p) => Math.max(1, p - 1)); }}
              disabled={page <= 1}
              className="rounded-sm px-sm py-xs text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-30"
            >
              {t('accounts.pagination.prev')}
            </button>
            <button
              onClick={() => { setPage((p) => p + 1); }}
              disabled={page >= totalPages}
              className="rounded-sm px-sm py-xs text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-30"
            >
              {t('accounts.pagination.next')}
            </button>
          </div>
        </div>
      </div>

      {/* Detail drawer */}
      <AccountDetailDrawer accountId={selectedId} onClose={handleCloseDrawer} />

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={deleteTarget !== null}
        title={t('accounts.delete.title')}
        description={t('accounts.delete.description')}
        confirmLabel={deleteMutation.isPending ? t('common.loading') : t('accounts.delete.confirm')}
        cancelLabel={t('accounts.delete.cancel')}
        onConfirm={handleDeleteConfirm}
        onCancel={handleCancelDelete}
        destructive
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
