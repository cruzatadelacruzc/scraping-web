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
        "<rootDir>/src/setupTests.ts",
        '<rootDir>/src/__tests__/jest.setup.ts'
    ],
    coverageProvider: "v8"    
}