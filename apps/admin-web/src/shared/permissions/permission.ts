import { RoleType } from '@shared/auth';

/** Atomic permissions resolved from session roles. */
export enum Permission {
  VIEW_DASHBOARD = 'dashboard:view',
  VIEW_HEALTH = 'health:view',
  VIEW_ACCOUNTS = 'accounts:view',
  MANAGE_ACCOUNTS = 'accounts:manage',
  VIEW_USERS = 'users:view',
  MANAGE_USERS = 'users:manage',
  VIEW_PRODUCTS = 'products:view',
  MANAGE_PRODUCTS = 'products:manage',
  VIEW_SCRAPERS = 'scrapers:view',
  MANAGE_SCRAPERS = 'scrapers:manage',
  VIEW_RULES = 'rules:view',
  MANAGE_RULES = 'rules:manage',
  VIEW_QUEUES = 'queues:view',
  MANAGE_ROLES = 'roles:manage',
  VIEW_LOGS = 'logs:view',
  VIEW_SETTINGS = 'settings:view',
  VIEW_PLANS = 'plans:view',
  MANAGE_PLANS = 'plans:manage',
  VIEW_SUBSCRIPTIONS = 'subscriptions:view',
  MANAGE_SUBSCRIPTIONS = 'subscriptions:manage',
}

/** Maps each RoleType to the set of atomic permissions it grants. */
export const ROLE_PERMISSIONS: Record<RoleType, Permission[]> = {
  [RoleType.SUPER_ADMIN]: Object.values(Permission),
  [RoleType.ACCOUNT_OWNER]: [Permission.VIEW_DASHBOARD, Permission.VIEW_ACCOUNTS],
  [RoleType.MEMBER]: [Permission.VIEW_DASHBOARD],
};
// TODO(product-owner): confirm ACCOUNT_OWNER/MEMBER permission sets
