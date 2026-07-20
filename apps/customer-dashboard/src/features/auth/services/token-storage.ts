const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const TOKEN_EXPIRY_KEY = 'token_expiry';

export const tokenStorage = {
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  getExpiry(): number | null {
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    return expiry ? Number(expiry) : null;
  },

  setTokens(tokens: { accessToken: string; refreshToken: string; expiresIn: number }): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    const expiry = Date.now() + tokens.expiresIn * 1000;
    localStorage.setItem(TOKEN_EXPIRY_KEY, String(expiry));
  },

  setAccessToken(accessToken: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  },

  clear(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  },

  isExpired(): boolean {
    const expiry = this.getExpiry();
    if (!expiry) return true;
    return Date.now() >= expiry;
  },

  hasValidToken(): boolean {
    const token = this.getAccessToken();
    return !!token && !this.isExpired();
  },
};

export function mapTokensToStorage(tokens: { accessToken: string; refreshToken: string; expiresIn: number }): { accessToken: string; refreshToken: string; expiresIn: number } {
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: tokens.expiresIn,
  };
}