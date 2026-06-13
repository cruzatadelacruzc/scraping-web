const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
  preset: 'ts-jest',
  globalSetup: '<rootDir>/src/__tests__/globalSetup.ts',
  globalTeardown: '<rootDir>/src/__tests__/globalTeardown.ts',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleDirectories: ['node_modules', 'src/main'],
  testEnvironment: 'node',
  maxWorkers: 1,
  modulePaths: [compilerOptions.baseUrl],
  moduleNameMapper: Object.assign(
    {
      // Specific overrides must go BEFORE generic path alias patterns
      '^jose$': '<rootDir>/src/__tests__/__mocks__/jose.ts',
      '^@shared/security/provider-token-verifier$': '<rootDir>/src/main/shared/security/__mocks__/provider-token-verifier.ts',
    },
    pathsToModuleNameMapper(compilerOptions.paths),
  ),
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setupTests.ts'],
  coverageProvider: 'v8',
};
