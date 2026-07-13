/** Centralized environment configuration. All values read from VITE_ prefixed env vars. */

function readString(key: string, fallback: string): string {
  const value: unknown = (import.meta.env as Record<string, unknown>)[key];
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function readNumber(key: string, fallback: number): number {
  const value = Number((import.meta.env as Record<string, unknown>)[key]);
  return Number.isFinite(value) ? value : fallback;
}

export const ENV = {
  /** Backend API base URL. */
  API_BASE_URL: readString('VITE_API_BASE_URL', 'http://localhost:3000/api'),

  /** Milliseconds before JWT expiry to trigger auto-refresh. */
  JWT_REFRESH_MARGIN_MS: readNumber('VITE_JWT_REFRESH_MARGIN_MS', 5 * 60 * 1000),

  /** Stale time for real-time data (queue stats, health). */
  STALE_TIME_REALTIME: readNumber('VITE_STALE_TIME_REALTIME', 30_000),

  /** Stale time for standard data (products, users, accounts, KPIs). */
  STALE_TIME_STANDARD: readNumber('VITE_STALE_TIME_STANDARD', 5 * 60 * 1000),

  /** Stale time for static data (roles, stores, feature flags). */
  STALE_TIME_STATIC: readNumber('VITE_STALE_TIME_STATIC', 30 * 60 * 1000),
} as const;
