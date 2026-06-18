// CJS mock for the ESM-only 'jose' package.
// Jest (ts-jest) runs in CommonJS mode and cannot load ESM modules.
// This stub provides the exports used by src/main/shared/security/provider-token-verifier.ts.

function createRemoteJWKSet(_url: URL): ReturnType<typeof jest.fn> {
  return jest.fn();
}

function jwtVerify(_token: string, _jwks: ReturnType<typeof jest.fn>): Promise<{ payload: Record<string, unknown> }> {
  return Promise.resolve({ payload: {} });
}

module.exports = { createRemoteJWKSet, jwtVerify };
