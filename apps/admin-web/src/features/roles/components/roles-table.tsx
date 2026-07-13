import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrentUser } from '@shared/auth';
import { Check, MoreHorizontal, Plus, Trash2, X } from 'lucide-react';

import { useCreateRole } from '../hooks/useCreateRole';
import { useDeleteRole } from '../hooks/useDeleteRole';
import { useGetRoles } from '../hooks/useGetRoles';
import type { RoleViewModel } from '../view-models/role-view-model';

export function RolesTable(): JSX.Element {
  const { t } = useTranslation();

  const { data, isLoading, isError, error, refetch } = useGetRoles();
  const createRole = useCreateRole();
  const deleteRole = useDeleteRole();
  const currentUser = useCurrentUser();

  // Inline create form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<RoleViewModel | null>(null);

  const handleCreate = () => {
    const name = newRoleName.trim();
    if (!name) return;
    createRole.mutate({ name }, {
      onSuccess: () => {
        setNewRoleName('');
        setShowCreateForm(false);
      },
    });
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteRole.mutate(deleteTarget.id, {
      onSuccess: () => { setDeleteTarget(null); },
    });
  };

  // ── 1. Loading ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-sm">
        <div className="flex items-center justify-between">
          <div className="h-6 w-32 animate-pulse rounded-sm bg-surface-container-high" />
          <div className="h-9 w-28 animate-pulse rounded-sm bg-surface-container-high" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 animate-pulse rounded-sm bg-surface-container-high" />
        ))}
      </div>
    );
  }

  // ── 2. Error ────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="rounded-md border border-danger bg-danger-muted p-md text-sm text-danger">
        <p className="font-semibold">{t('roles.error.title')}</p>
        <p className="mt-xs">{error instanceof Error ? error.message : t('roles.error.message')}</p>
        <button
          onClick={() => { void refetch(); }}
          className="mt-sm rounded-sm bg-danger px-sm py-xs text-white transition-opacity hover:opacity-90"
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  // ── 3. Empty ────────────────────────────────────────────────────────────
  if (!data || data.items.length === 0) {
    return (
      <div className="py-xl text-center">
        <p className="text-lg font-semibold text-on-surface">{t('roles.empty.title')}</p>
        <p className="mt-sm text-body-sm text-on-surface-variant">
          {t('roles.empty.description')}
        </p>

        {/* Inline create when empty */}
        {showCreateForm ? (
          <div className="mt-md mx-auto flex max-w-xs items-center gap-xs">
            <input
              type="text"
              value={newRoleName}
              onChange={(e) => { setNewRoleName(e.target.value); }}
              placeholder={t('roles.create.placeholder')}
              className="flex-1 rounded-sm border border-outline-variant bg-surface px-sm py-xs text-body-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={handleCreate}
              disabled={createRole.isPending || !newRoleName.trim()}
              className="rounded-sm bg-primary px-sm py-xs text-body-sm text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
              aria-label={t('roles.create.save')}
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={() => { setShowCreateForm(false); setNewRoleName(''); }}
              className="rounded-sm px-sm py-xs text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container-high"
              aria-label={t('roles.create.cancel')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setShowCreateForm(true); }}
            className="mt-md inline-flex items-center gap-xs rounded-sm bg-primary px-sm py-xs text-body-sm text-on-primary transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            {t('roles.create.button')}
          </button>
        )}
      </div>
    );
  }

  // ── 4. Data ─────────────────────────────────────────────────────────────
  return (
    <div className="rounded-md border border-outline-variant">
      {/* Header + Create button */}
      <div className="flex items-center justify-between border-b border-outline-variant px-sm py-sm">
        <span className="text-body-sm font-semibold text-on-surface">
          {t('roles.table.title', { count: data.total })}
        </span>

        {showCreateForm ? (
          <div className="flex items-center gap-xs">
            <input
              type="text"
              value={newRoleName}
              onChange={(e) => { setNewRoleName(e.target.value); }}
              placeholder={t('roles.create.placeholder')}
              className="w-48 rounded-sm border border-outline-variant bg-surface px-sm py-xs text-body-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={handleCreate}
              disabled={createRole.isPending || !newRoleName.trim()}
              className="rounded-sm bg-primary px-sm py-xs text-body-sm text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
              title={t('roles.create.save')}
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={() => { setShowCreateForm(false); setNewRoleName(''); }}
              className="rounded-sm px-sm py-xs text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container-high"
              title={t('roles.create.cancel')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setShowCreateForm(true); }}
            className="inline-flex items-center gap-xs rounded-sm bg-primary px-sm py-xs text-body-sm text-on-primary transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            {t('roles.create.button')}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-body-sm">
          <caption className="sr-only">{t('roles.table.caption')}</caption>
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container-low text-left text-label-xs font-mono uppercase text-on-surface-variant">
              <th className="p-sm">{t('roles.table.name')}</th>
              <th className="p-sm">{t('roles.table.users')}</th>
              <th className="p-sm w-12">{t('roles.table.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((role) => (
              <tr
                key={role.id}
                className="border-b border-outline-variant transition-colors hover:bg-surface-container-high"
              >
                <td className="p-sm font-medium text-on-surface">{role.name}</td>
                <td className="p-sm font-mono text-on-surface-variant">{role.userCount}</td>
                <td className="p-sm">
                  {currentUser?.roles.includes(role.name) ? (
                    <button
                      disabled
                      className="cursor-not-allowed rounded-sm p-1 text-on-surface-variant opacity-40"
                      aria-label={t('roles.cannotDeleteSelf')}
                      title={t('roles.cannotDeleteSelf')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => { setDeleteTarget(role); }}
                      className="rounded-sm p-1 text-on-surface-variant transition-colors hover:bg-danger-muted hover:text-danger"
                      aria-label={t('roles.delete.label', { role: role.name })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer with total */}
      <div className="flex items-center justify-between border-t border-outline-variant px-sm py-sm">
        <span className="text-body-sm text-on-surface-variant">
          {t('roles.pagination.info', { total: data.total })}
        </span>
      </div>

      {/* ── Delete Confirmation Dialog ─────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void-black/60">
          <div className="w-full max-w-sm rounded-md border border-outline-variant bg-surface p-md shadow-lg">
            <h3 className="text-headline-sm text-on-surface">{t('roles.delete.title')}</h3>
            <p className="mt-sm text-body-sm text-on-surface-variant">
              {t('roles.delete.description', { role: deleteTarget.name })}
            </p>
            <div className="mt-md flex justify-end gap-xs">
              <button
                onClick={() => { setDeleteTarget(null); }}
                disabled={deleteRole.isPending}
                className="rounded-sm border border-outline-variant px-sm py-xs text-body-sm text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-50"
              >
                {t('roles.delete.cancel')}
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteRole.isPending}
                className="rounded-sm bg-danger px-sm py-xs text-body-sm text-on-danger transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {deleteRole.isPending ? (
                  <span className="flex items-center gap-xs">
                    <MoreHorizontal className="h-4 w-4 animate-pulse" />
                    {t('roles.delete.deleting')}
                  </span>
                ) : (
                  t('roles.delete.confirm')
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
