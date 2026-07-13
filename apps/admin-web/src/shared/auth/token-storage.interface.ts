/**
 * Interchangeable token storage backend.
 * Current implementation: InMemoryStorage (closure variables, no XSS surface).
 * Future: CookieStorage (if backend migrates to HttpOnly cookies).
 */
export interface ITokenStorage {
  getAccessToken(): string | null;
  getRefreshToken(): string | null;
  setAccessToken(token: string): void;
  setRefreshToken(token: string): void;
  clear(): void;
}
