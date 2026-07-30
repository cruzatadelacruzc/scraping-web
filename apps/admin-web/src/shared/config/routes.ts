/** Centralized route paths. No hardcoded strings in components. */
export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  ACCOUNTS: '/accounts',
  USERS: '/users',
  PRODUCTS: '/products',
  PRODUCTS_STATS: '/products/stats',
  PLANS: '/plans',
  PRODUCT_DETAIL: '/products/:id',
  SCRAPERS: '/scrapers',
  RULES: '/rules',
  QUEUES: '/queues',
  SETTINGS: '/settings',
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];

/** Build a product detail path with the given id */
export function productDetailRoute(id: string): string {
  return `/products/${encodeURIComponent(id)}`;
}
