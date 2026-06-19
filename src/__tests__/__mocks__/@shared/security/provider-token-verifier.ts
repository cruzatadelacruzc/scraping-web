/**
 * Manual mock for ProviderTokenVerifier — avoids ESM 'jose' import during tests.
 *
 * Jest auto-loads this from __mocks__ when any test imports the real module,
 * no per-file jest.mock() call needed.
 */

export const ProviderTokenVerifier = jest.fn().mockImplementation(() => ({
  verifyProvider: jest.fn().mockImplementation((_provider: string, opts: { idToken?: string; accessToken?: string }) => {
    void _provider;
    const email = opts.idToken || 'mock@example.com';
    return Promise.resolve({
      providerId: 'prov-1',
      email,
      email_verified: true,
      name: 'Mock User',
      picture: null,
    });
  }),
  verifyGoogleIdToken: jest.fn().mockResolvedValue({
    provider: 'google',
    providerId: 'google-123',
    email: 'mock@example.com',
    email_verified: true,
  }),
  verifyFacebookAccessToken: jest.fn().mockResolvedValue({
    provider: 'facebook',
    providerId: 'fb-123',
    email: 'mock@example.com',
    email_verified: true,
  }),
}));
