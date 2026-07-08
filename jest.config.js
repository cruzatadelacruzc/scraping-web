const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
  preset: 'ts-jest',
  globalSetup: '<rootDir>/src/__tests__/globalSetup.ts',
  globalTeardown: '<rootDir>/src/__tests__/globalTeardown.ts',
  testMatch: ['**/__tests__/**/*.test.ts'],
  // Ignore compiled output and the build cache so Jest's haste-map doesn't
  // pick up duplicate __mocks__ folders from `dist/`.
  modulePathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/node_modules/'],
  moduleDirectories: ['node_modules', 'src/main'],
  testEnvironment: 'node',
  maxWorkers: 1,
  modulePaths: [compilerOptions.baseUrl],
  moduleNameMapper: Object.assign(
    {
      // Specific overrides must go BEFORE generic path alias patterns
      '^jose$': '<rootDir>/src/__tests__/__mocks__/jose.ts',
      '^ai$': '<rootDir>/src/__tests__/__mocks__/ai.ts',
      '^@ai-sdk/openai-compatible$': '<rootDir>/src/__tests__/__mocks__/@ai-sdk/openai-compatible.ts',
      '^@shared/security/provider-token-verifier$': '<rootDir>/src/main/shared/security/__mocks__/provider-token-verifier.ts',
    },
    pathsToModuleNameMapper(compilerOptions.paths),
  ),
  setupFiles: ['<rootDir>/src/__tests__/setup-env.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setupTests.ts'],
  // Jest waits up to 30s after a test run for open handles (sockets, workers)
  // to close before reporting "Jest did not exit". The default 1s is too
  // aggressive when integration tests open real Postgres / Redis connections
  // whose graceful shutdown takes longer than 1s.
  openHandlesTimeout: 30000,
  coverageProvider: 'v8',
};
