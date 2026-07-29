import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@shared/ui/dialog';

import { AlertDialog } from '@/shared/ui/alert-dialog';

import { useGetRoles } from '../hooks/useGetRoles';
import { useToggleRole } from '../hooks/useToggleRole';
import type { RoleViewModel } from '../view-models/user-view-model';

/** SUPER_ADMIN can never be deactivated — the backend rejects it with 409. */
const PROTECTED_ROLE = 'SUPER_ADMIN';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ManageRolesDialog({ open, onClose }: Props): JSX.Element {
  const { t } = useTranslation();
  const { data: roles, isLoading, isError, refetch } = useGetRoles();
  const toggleRole = useToggleRole();
  const [confirmRole, setConfirmRole] = useState<RoleViewModel | null>(null);

  const handleToggle = useCallback(
    (role: RoleViewModel) => {
      if (role.active) {
        setConfirmRole(role);
        return;
      }
      toggleRole.mutate(role.id);
    },
    [toggleRole],
  );

  const handleConfirmDeactivate = useCallback(() => {
    if (!confirmRole) return;
    toggleRole.mutate(confirmRole.id, {
      onSuccess: () => {
        setConfirmRole(null);
      },
    });
  }, [confirmRole, toggleRole]);

  const handleCancelDeactivate = useCallback(() => {
    setConfirmRole(null);
  }, []);

  return (
    <>
      <Dialog open={open} title={t('roles.dialogTitle')} onClose={onClose} maxWidth="max-w-md">
        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-sm">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-9 animate-pulse rounded-sm bg-surface-container-high" />
            ))}
          </div>
        )}

        {/* Error — message + Retry (rule 4.3 in admin-web-ui.md) */}
        {isError && (
          <div className="rounded-md border border-danger bg-danger-muted p-md text-sm text-danger">
            <p>{t('roles.loadError')}</p>
            <button
              onClick={() => {
                void refetch();
              }}
              className="mt-sm rounded-sm border border-danger px-sm py-xs text-body-sm text-danger transition-colors hover:bg-danger/10"
            >
              {t('roles.retry')}
            </button>
          </div>
        )}

        {/* Data */}
        {roles && (
          <ul className="space-y-sm">
            {roles.map((role) => {
              const isProtected = role.name === PROTECTED_ROLE;
              return (
                <li
                  key={role.id}
                  className="flex items-center justify-between rounded-sm border border-outline-variant px-sm py-xs"
                >
                  <div>
                    <span className="font-mono text-body-sm text-on-surface">{role.name}</span>
                    <div className="mt-xs flex items-center gap-xs text-label-xs text-on-surface-variant">
                      <span className={role.active ? 'text-success' : 'text-warning'}>
                        {role.active ? t('roles.active') : t('roles.inactive')}
                      </span>
                      <span>·</span>
                      <span>{t('roles.userCount', { count: role.userCount })}</span>
                      {isProtected && (
                        <>
                          <span>·</span>
                          <span>{t('roles.protected')}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    role="switch"
                    aria-checked={role.active}
                    aria-label={
                      role.active
                        ? t('roles.toggleOff', { role: role.name })
                        : t('roles.toggleOn', { role: role.name })
                    }
                    disabled={isProtected || toggleRole.isPending}
                    onClick={() => {
                      handleToggle(role);
                    }}
                    className={`relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      role.active ? 'bg-primary' : 'bg-surface-container-highest'
                    }`}
                  >
                    <span
                      className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                        role.active ? 'translate-x-4' : ''
                      }`}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Dialog>

      {/* Deactivation confirmation (suspend-like: blocks new assignments) */}
      <AlertDialog
        open={confirmRole !== null}
        title={t('roles.deactivateTitle')}
        description={t('roles.deactivateDescription', { role: confirmRole?.name ?? '' })}
        confirmLabel={t('roles.deactivateConfirm')}
        cancelLabel={t('roles.cancel')}
        destructive
        isLoading={toggleRole.isPending}
        onConfirm={handleConfirmDeactivate}
        onCancel={handleCancelDeactivate}
      />
    </>
  );
}
