module.exports = {
    preset: 'ts-jest',
    globalSetup: '<rootDir>/src/__tests__/globalSetup.ts',
    globalTeardown: "<rootDir>/src/__tests__/globalTeardown.ts",
    testMatch: ['**/__tests__/**/*.test.ts'],
    testPathIgnorePatterns: ['/node_modules/'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1'
    },
    setupFilesAfterEnv: [
        "<rootDir>/src/setupTests.ts"
    ]
}