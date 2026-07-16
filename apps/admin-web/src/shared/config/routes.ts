/** Centralized route paths. No hardcoded strings in components. */
export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  ACCOUNTS: '/accounts',
  USERS: '/users',
  ROLES: '/roles',
  PRODUCTS: '/products',
  PRODUCTS_STATS: '/products/stats',
  SCRAPERS: '/scrapers',
  RULES: '/rules',
  QUEUES: '/queues',
  SETTINGS: '/settings',
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];
