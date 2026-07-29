export interface JwtPayload {
  userId?: string;
  tenantId?: string;
  roles?: string[];
  jti?: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

/**
 * Decodes a JWT payload client-side WITHOUT verifying the signature
 * (the server owns verification). Returns null on any malformed input.
 */
export function decodeJwt(token: string): JwtPayload | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** Epoch ms of the token's `exp`, falling back to now + 24h if undecodable. */
export function expiresAtFromToken(token: string): number {
  const decoded = decodeJwt(token);
  return decoded?.exp ? decoded.exp * 1000 : Date.now() + ONE_DAY_MS;
}
