/** Centralized environment configuration. All values read from VITE_ prefixed env vars. */

export const ENV = {
  /** Backend API base URL. */
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api',

  /** Milliseconds before JWT expiry to trigger auto-refresh. */
  JWT_REFRESH_MARGIN_MS: Number(import.meta.env.VITE_JWT_REFRESH_MARGIN_MS) || 5 * 60 * 1000,

  /** Stale time for real-time data (queue stats, health). */
  STALE_TIME_REALTIME: Number(import.meta.env.VITE_STALE_TIME_REALTIME) || 30_000,

  /** Stale time for standard data (products, users, accounts, KPIs). */
  STALE_TIME_STANDARD: Number(import.meta.env.VITE_STALE_TIME_STANDARD) || 5 * 60 * 1000,

  /** Stale time for static data (roles, stores, feature flags). */
  STALE_TIME_STATIC: Number(import.meta.env.VITE_STALE_TIME_STATIC) || 30 * 60 * 1000,
} as const;
