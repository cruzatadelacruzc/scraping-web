import { Permission, ROLE_PERMISSIONS } from './types';

/** Expands a user's role names into the flat set of permission strings. */
export function rolesToPermissions(roles: string[]): string[] {
  const set = new Set<string>();
  if (roles.includes('SUPER_ADMIN')) {
    Object.values(Permission).forEach((p) => set.add(p));
    return [...set];
  }
  for (const role of roles) {
    (ROLE_PERMISSIONS[role] ?? []).forEach((p) => set.add(p));
  }
  return [...set];
}
