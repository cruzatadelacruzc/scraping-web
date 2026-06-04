import { InvalidArgumentError } from '@shared/errors/invalid-argument.error';
import { ProviderTokenError } from './provideer-token.error';
import { ProviderConfigError } from './provider-config.error';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { inject, injectable } from 'inversify';
import { TYPES } from '@shared/types.container';
import { ILogger } from '@shared/logger.interfaces';
/**
 * Provider token verifier (DEV : tokeninfo/debug_token, PROD : JWKS verification)
 * Uses custom error classes instead of generic Error.
 *
 * Dependencies:
 *   pnpm add node-fetch jose
 *   pnpm add -D @types/node-fetch
 *
 * Usage:
 *   const claims = await ProviderTokenVerifier.verifyProvider('google', { idToken });
 */

export type VerifiedProviderClaims = {
  provider: string;
  providerId: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  raw?: Record<string, any>;
};

@injectable()
export class ProviderTokenVerifier {
  private GOOGLE_ISSUERS = process.env.GOOGLE_ISSUERS || 'accounts.google.com,https://accounts.google.com';
  private GOOGLE_JWKS_URI = process.env.GOOGLE_JWKS_URI || 'https://www.googleapis.com/oauth2/v3/certs';

  public constructor(@inject(TYPES.Logger) private readonly _log: ILogger) {
    this._log.context = ProviderTokenVerifier.name;
  }

  private parseIssuers = (issuers: string): string[] => issuers.split(',').map(s => s.trim());

  /**
   * Verifies a Google ID token.
   * - In development: uses tokeninfo endpoint (fast/simple).
   * - In production: verifies signature + claims via JWKS and jose.
   * @param {string} idToken - The Google ID token to verify
   * @param {string} expectedAudience - The expected audience (GOOGLE_CLIENT_ID)
   * @returns {Promise<VerifiedProviderClaims>} The verified provider claims
   * @throws {InvalidArgumentError} If the idToken is missing
   * @throws {ProviderConfigError} If the expectedAudience is missing in production
   * @throws {ProviderTokenError} If the token verification fails
   */
  public async verifyGoogleIdToken(idToken: string, expectedAudience: string): Promise<VerifiedProviderClaims> {
    if (!idToken) throw new InvalidArgumentError('Missing idToken for Google');

    const isProd = process.env.NODE_ENV === 'production';

    if (!isProd) {
      // DEV: quick HTTP validation (convenient for development)
      const tokenInfoBase = process.env.GOOGLE_TOKENINFO_URL || 'https://oauth2.googleapis.com/tokeninfo';
      const url = `${tokenInfoBase}?id_token=${encodeURIComponent(idToken)}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new ProviderTokenError('Invalid Google ID token (tokeninfo)');
      }
      const json = (await res.json()) as Record<string, unknown>;
      return {
        provider: 'google',
        providerId: String(json.sub),
        email: typeof json.email === 'string' ? json.email : undefined,
        email_verified: json.email_verified === 'true' || json.email_verified === true,
        name: typeof json.name === 'string' ? json.name : undefined,
        picture: typeof json.picture === 'string' ? json.picture : undefined,
        raw: json,
      };
    }

    // PRODUCTION: use JWKS + jose to verify signature and claims
    if (!expectedAudience) {
      throw new ProviderConfigError('Missing expected audience (GOOGLE_CLIENT_ID) for production verification');
    }

    const jwks = createRemoteJWKSet(new URL(this.GOOGLE_JWKS_URI));

    const issuer = this.parseIssuers(this.GOOGLE_ISSUERS);

    const checks = {
      audience: expectedAudience,
      issuer,
    } as const;

    let payload: JWTPayload;
    try {
      const verified = await jwtVerify(idToken, jwks, checks as any);
      payload = verified.payload;
    } catch (err) {
      if (err instanceof Error) this._log.error('Error verifying Google ID token:', err.message);
      throw new ProviderTokenError('Invalid Google ID token (signature/claims verification failed)');
    }

    const sub = typeof payload.sub === 'string' ? payload.sub : undefined;
    if (!sub) throw new ProviderTokenError('Google token missing sub claim');

    const email = typeof payload.email === 'string' ? payload.email : undefined;
    const email_verified = payload.email_verified === true || payload.email_verified === 'true';
    const name = typeof payload.name === 'string' ? payload.name : undefined;
    const picture = typeof payload.picture === 'string' ? payload.picture : undefined;

    return {
      provider: 'google',
      providerId: sub,
      email,
      email_verified,
      name,
      picture,
      raw: Object.fromEntries(Object.entries(payload).map(([k, v]) => [k, v as any])),
    };
  }

  /**
   * Verifies a Facebook access token via debug_token and then reads profile.
   *
   * @param {string} accessToken - The Facebook user access token to verify
   * @param {string} appToken - The Facebook app token (APP_ID|APP_SECRET) or a valid app access token
   * @returns {Promise<VerifiedProviderClaims>} The verified provider claims
   * @throws {InvalidArgumentError} If the accessToken is missing
   * @throws {ProviderConfigError} If the appToken is missing
   * @throws {ProviderTokenError} If the token verification fails
   */
  public async verifyFacebookAccessToken(accessToken: string, appToken: string): Promise<VerifiedProviderClaims> {
    if (!accessToken) throw new InvalidArgumentError('Missing accessToken for Facebook');
    if (!appToken) throw new ProviderConfigError('Missing FACEBOOK_APP_TOKEN (or APP_ID+APP_SECRET)');

    const debugBase = process.env.FACEBOOK_DEBUG_TOKEN_URL || 'https://graph.facebook.com/debug_token';
    const debugUrl = `${debugBase}?input_token=${encodeURIComponent(accessToken)}&access_token=${encodeURIComponent(appToken)}`;
    const debugRes = await fetch(debugUrl);
    if (!debugRes.ok) throw new ProviderTokenError('Invalid Facebook access token (debug_token)');
    const debugJson = (await debugRes.json()) as { data?: { is_valid?: boolean } };
    const data = debugJson.data;
    if (!data?.is_valid) throw new ProviderTokenError('Invalid Facebook access token (not valid)');

    const meBase = process.env.FACEBOOK_ME_URL || 'https://graph.facebook.com/me';
    const meUrl = `${meBase}?fields=id,name,email,picture&access_token=${encodeURIComponent(accessToken)}`;
    const meRes = await fetch(meUrl);
    if (!meRes.ok) throw new ProviderTokenError('Failed to fetch Facebook profile');
    const me = (await meRes.json()) as unknown as { id?: string; email?: string; name?: string; picture?: { data?: { url?: string } } };

    return {
      provider: 'facebook',
      providerId: String(me.id),
      email: typeof me.email === 'string' ? me.email : undefined,
      email_verified: true,
      name: typeof me.name === 'string' ? me.name : undefined,
      picture: me.picture?.data?.url,
      raw: { debug: data, profile: me },
    };
  }

  public async verifyProvider(provider: string, opts: { idToken?: string; accessToken?: string }): Promise<VerifiedProviderClaims> {
    const p = provider?.toLowerCase?.();
    if (!p) throw new InvalidArgumentError('Missing provider');

    if (p === 'google') {
      const idToken = opts.idToken;
      if (!idToken) throw new InvalidArgumentError('Missing idToken for Google');
      const audience = process.env.GOOGLE_CLIENT_ID || '';
      return await this.verifyGoogleIdToken(idToken, audience);
    }

    if (p === 'facebook') {
      const accessToken = opts.accessToken;
      if (!accessToken) throw new InvalidArgumentError('Missing accessToken for Facebook');
      const appToken =
        process.env.FACEBOOK_APP_TOKEN ||
        (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET
          ? `${process.env.FACEBOOK_APP_ID}|${process.env.FACEBOOK_APP_SECRET}`
          : undefined);
      if (!appToken) throw new ProviderConfigError('Missing FACEBOOK_APP_TOKEN (or APP_ID+APP_SECRET) in env');
      return await this.verifyFacebookAccessToken(accessToken, appToken);
    }

    throw new InvalidArgumentError(`Unsupported provider: ${provider}`);
  }
}
