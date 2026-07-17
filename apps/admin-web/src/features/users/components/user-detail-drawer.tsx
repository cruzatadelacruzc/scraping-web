import { useCallback,useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrentUser } from '@shared/auth';
import { Trash2,X } from 'lucide-react';

import { AlertDialog } from '@/shared/ui/alert-dialog';

import { useAssignRole } from '../hooks/useAssignRole';
import { useDeleteUser } from '../hooks/useDeleteUser';
import { useGetRoles } from '../hooks/useGetRoles';
import { useGetUser } from '../hooks/useGetUser';
import { useRemoveRole } from '../hooks/useRemoveRole';

interface Props {
  userId: string | null;
  onClose: () => void;
}

export function UserDetailDrawer({ userId, onClose }: Props): JSX.Element {
  const { t } = useTranslation();
  const currentUser = useCurrentUser();
  const isSelf = userId !== null && currentUser?.userId === userId;
  const { data, isLoading, isError } = useGetUser(userId);
  const { data: roles } = useGetRoles();
  const assignRole = useAssignRole();
  const removeRole = useRemoveRole();
  const deleteUser = useDeleteUser();

  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isOpen = userId !== null;

  const handleAssignRole = useCallback(() => {
    if (!selectedRoleId || !userId) return;
    assignRole.mutate({ userId, roleId: selectedRoleId });
    setSelectedRoleId('');
  }, [selectedRoleId, userId, assignRole]);

  const handleRemoveRole = useCallback(
    (roleId: string) => {
      if (!userId) return;
      removeRole.mutate({ userId, roleId });
    },
    [userId, removeRole],
  );

  const handleDeleteConfirm = useCallback(() => {
    if (!userId) return;
    deleteUser.mutate(userId, {
      onSuccess: () => {
        setShowDeleteDialog(false);
        onClose();
      },
    });
  }, [userId, deleteUser, onClose]);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteDialog(false);
  }, []);

  // Build a map of roleName → roleId from the roles list
  const roleNameToId: Record<string, string> = {};
  if (roles) {
    for (const role of roles) {
      roleNameToId[role.name] = role.id;
    }
  }

  // Roles that are not assigned to this user (filter out duplicates)
  const availableRoles =
    roles?.filter((r) => !data?.roles.includes(r.name)) ?? [];

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={onClose}
          onKeyDown={(e) => { if (e.key === 'Escape' || e.key === 'Enter') onClose(); }}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 z-50 h-full w-96 transform border-l border-outline-variant bg-surface-container-high p-lg shadow-lg transition-transform duration-200 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="mb-lg flex items-center justify-between">
          <h2 className="text-lg font-semibold text-on-surface">
            {t('users.detailTitle')}
          </h2>
          <button
            onClick={onClose}
            className="rounded-sm p-xs text-on-surface-variant hover:bg-surface-container-highest"
            aria-label={t('users.drawerClose')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-sm">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-6 animate-pulse rounded-sm bg-surface-container-highest"
              />
            ))}
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="rounded-md border border-danger bg-danger-muted p-md text-sm text-danger">
            {t('users.detailError')}
          </div>
        )}

        {/* Data */}
        {data && (
          <>
            <dl className="space-y-md">
              <div>
                <dt className="text-label-xs font-mono text-on-surface-variant">
                  {t('users.displayName')}
                </dt>
                <dd className="mt-xs text-body-md text-on-surface">{data.displayName}</dd>
              </div>
              <div>
                <dt className="text-label-xs font-mono text-on-surface-variant">
                  {t('users.username')}
                </dt>
                <dd className="mt-xs font-mono text-body-sm text-on-surface-variant">
                  {data.username}
                </dd>
              </div>
              <div>
                <dt className="text-label-xs font-mono text-on-surface-variant">
                  {t('users.email')}
                </dt>
                <dd className="mt-xs text-body-md text-on-surface">{data.email}</dd>
              </div>
              <div>
                <dt className="text-label-xs font-mono text-on-surface-variant">
                  {t('users.verified')}
                </dt>
                <dd className="mt-xs">
                  {data.emailVerified ? (
                    <span className="text-success">{t('users.verifiedYes')}</span>
                  ) : (
                    <span className="text-warning">{t('users.verifiedNo')}</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-label-xs font-mono text-on-surface-variant">
                  {t('users.createdAt')}
                </dt>
                <dd className="mt-xs text-body-md text-on-surface">
                  {data.createdAt.toLocaleDateString()}
                </dd>
              </div>

              {/* Roles */}
              <div>
                <dt className="mb-xs text-label-xs font-mono text-on-surface-variant">
                  {t('users.roles')}
                </dt>
                <dd>
                  <div className="flex flex-wrap gap-xs">
                    {data.roles.length === 0 && (
                      <span className="text-body-sm text-on-surface-variant">
                        {t('users.noRoles')}
                      </span>
                    )}
                    {data.roles.map((roleName) => {
                      const roleId = roleNameToId[roleName];
                      return (
                        <span
                          key={roleName}
                          className="inline-flex items-center gap-xs rounded-sm bg-primary/10 px-xs py-0.5 text-label-xs font-mono text-primary"
                        >
                          {roleName}
                          {roleId && (
                            <button
                              onClick={() => { handleRemoveRole(roleId); }}
                              className="rounded-sm p-[1px] text-primary/60 hover:bg-primary/20 hover:text-primary"
                              aria-label={t('users.removeRole', { role: roleName })}
                            >
                              <X size={12} />
                            </button>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </dd>
              </div>
            </dl>

            {/* Assign role */}
            <div className="mt-lg border-t border-outline-variant pt-lg">
              <label className="mb-xs block text-label-xs font-mono text-on-surface-variant">
                {t('users.assignRole')}
              </label>
              <div className="flex gap-xs">
                <select
                  value={selectedRoleId}
                  onChange={(e) => { setSelectedRoleId(e.target.value); }}
                  className="flex-1 rounded-sm border border-outline-variant bg-surface px-sm py-xs text-body-sm text-on-surface"
                  aria-label={t('users.selectRole')}
                >
                  <option value="">{t('users.selectRole')}</option>
                  {availableRoles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAssignRole}
                  disabled={!selectedRoleId || assignRole.isPending}
                  className="rounded-sm bg-primary px-sm py-xs text-body-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
                >
                  {t('users.addRole')}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-lg border-t border-outline-variant pt-lg">
              <button
                onClick={() => { setShowDeleteDialog(true); }}
                disabled={isSelf}
                title={isSelf ? t('users.cannotDeleteSelf') : undefined}
                className="inline-flex items-center gap-xs rounded-sm px-sm py-xs text-body-sm text-danger transition-colors hover:bg-danger-muted disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={isSelf ? t('users.cannotDeleteSelf') : t('users.deleteUser')}
              >
                <Trash2 size={14} />
                {t('users.deleteUser')}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog
        open={showDeleteDialog}
        title={t('users.deleteTitle')}
        description={t('users.deleteDescription')}
        confirmLabel={t('users.permanentlyDelete')}
        cancelLabel={t('users.cancelDelete')}
        destructive
        isLoading={deleteUser.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={handleCancelDelete}
      />
    </>
  );
}
