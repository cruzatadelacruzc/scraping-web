import { useCallback } from 'react';
import { useCurrentUser } from '@shared/auth';

import type { Permission } from './permission';
import { ROLE_PERMISSIONS } from './permission';

/**
 * Returns a function that checks whether the current user has a given permission.
 * Unauthenticated users receive no permissions.
 *
 * @example
 * ```tsx
 * const hasPermission = useHasPermission();
 * if (hasPermission(Permission.VIEW_ACCOUNTS)) { ... }
 * ```
 */
export function useHasPermission(): (p: Permission) => boolean {
  const session = useCurrentUser();

  return useCallback(
    (permission: Permission): boolean => {
      if (!session) return false;
      return session.roles.some((role) => {
        return ROLE_PERMISSIONS[role].includes(permission);
      });
    },
    [session],
  );
}
