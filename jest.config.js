const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
    preset: 'ts-jest',
    globalSetup: '<rootDir>/src/__tests__/globalSetup.ts',
    globalTeardown: "<rootDir>/src/__tests__/globalTeardown.ts",
    testMatch: ['**/__tests__/**/*.test.ts'],
    testEnvironment: 'node',
    modulePaths: [compilerOptions.baseUrl],
    moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths),
    setupFilesAfterEnv: [
        "<rootDir>/src/__tests__/setupTests.ts",
    ],
    coverageProvider: "v8"    
}