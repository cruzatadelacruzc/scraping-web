---
name: testing
description: 'Project-specific testing patterns: Jest + ts-jest, MongoMemoryServer (in-process, version 4.4.22), Prisma mocks, AsyncLocalStorage tenant-context-als mocks, ESM jose moduleNameMapper workaround, and runWithRequestContext for tenant-scoped integration tests. Use when writing or reviewing tests for the BazaarSentinel project.'
applyTo: 'src/__tests__/**, jest.config.js, jest-mongodb-config.js'
risk: low
---

# Testing — Project-Specific Patterns

The project uses Jest with `ts-jest`, `MongoMemoryServer` for Mongo, and mocks for Prisma, ALS, and the ESM `jose` module. This skill covers the patterns that differ from generic Jest usage.

## File structure

```
src/__tests__/
├── globalSetup.ts        # boots MongoMemoryServer, sets DB_URI, drops DB before suite
├── globalTeardown.ts     # stops MongoMemoryServer
├── setupTests.ts         # jest.mock() for prisma + ALS, mongoose connect/disconnect
├── unit/                 # *.test.ts — mirrors src/main/<module>/<filename>.test.ts
├── integration/          # *.test.ts — full-stack flows
└── __mocks__/
    └── jose.ts           # CJS stub for ESM jose module
```

Tests are colocated by mirror path:

```typescript
src/main/users/services/auth.service.ts
  → src/__tests__/unit/auth.service.test.ts

src/main/scrapers/revolico/services/scraping-product.service.ts
  → src/__tests__/unit/scraping-product.service.test.ts
```

## jest.config.js (the critical bits)

```javascript
module.exports = {
  preset: 'ts-jest',
  globalSetup:    '<rootDir>/src/__tests__/globalSetup.ts',
  globalTeardown: '<rootDir>/src/__tests__/globalTeardown.ts',
  testMatch:      ['**/__tests__/**/*.test.ts'],
  modulePathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/node_modules/'],
  moduleDirectories: ['node_modules', 'src/main'],
  testEnvironment: 'node',
  maxWorkers: 1,                         // MongoMemoryServer doesn't support parallel
  moduleNameMapper: Object.assign(
    {
      // Specific overrides MUST come BEFORE generic path aliases
      '^jose$': '<rootDir>/src/__tests__/__mocks__/jose.ts',
      '^@shared/security/provider-token-verifier$':
        '<rootDir>/src/main/shared/security/__mocks__/provider-token-verifier.ts',
    },
    pathsToModuleNameMapper(compilerOptions.paths),
  ),
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setupTests.ts'],
  coverageProvider: 'v8',
};
```

Key points:
- `maxWorkers: 1` — `MongoMemoryServer` shares one in-process instance. Running parallel workers produces cross-test pollution.
- `moduleNameMapper` order matters: specific patterns (`^jose$`) must come BEFORE generic path alias patterns, otherwise the alias wins.
- `setupFilesAfterEnv` runs `setupTests.ts` which wires global mocks.

## ESM `jose` mocking

The `jose` library is ESM-only and breaks Jest's CJS runtime. The project solves this two ways:

1. **`moduleNameMapper`** routes `import ... from 'jose'` to `<rootDir>/src/__tests__/__mocks__/jose.ts`.
2. **`setupTests.ts`** calls `jest.mock('@shared/security/provider-token-verifier')` globally so the verifier's transitive `jose` import is intercepted before it ever loads.

You should NOT need to add `jest.mock('jose')` in individual tests. If you do, something is wrong with the moduleNameMapper or the `@shared/security/provider-token-verifier` import path.

If you must override per-test:

```typescript
jest.mock('@shared/security/provider-token-verifier', () => ({
  verifyProvider: jest.fn().mockResolvedValue({ sub: 'google-123', email: 'a@b.c' }),
}));
```

See `src/__tests__/unit/user.service.registerLocal.test.ts` for the override pattern.

## MongoMemoryServer

`jest-mongodb-config.js`:

```javascript
module.exports = {
  mongodbMemoryServerOptions: {
    binary: { version: '4.4.22', skipMD5: true },
    instance: { dbName: 'jest' },
    autoStart: false,                // globalSetup.ts starts it manually
  },
};
```

`src/__tests__/globalSetup.ts` starts the server in-process, sets `process.env.DB_URI`, and drops the DB before each suite. Tests connect via mongoose automatically in `setupTests.ts#beforeAll`.

Don't try to connect to a real DB from tests. Don't add `autoStart: true` — the manual start lets globalSetup drop and reseed cleanly.

## Tenant context (AsyncLocalStorage)

Two flavors:

### Unit tests — mock ALS

`setupTests.ts` mocks `@shared/tenant-context-als` globally. The mock provides:

- `resetMockTenantId()` — reset between tests (called in `beforeEach`/`afterEach`).
- `runWithRequestContext(ctx, fn)` — optional pass-through if a test wants to set a context.

To set a tenant in a unit test:

```typescript
import { runWithRequestContext } from '@shared/tenant-context-als';

it('returns only alarms for the current tenant', async () => {
  await runWithRequestContext({ tenantId: 'tenant-1', userId: 'user-1' }, async () => {
    const result = await alarmService.list();
    expect(result).toHaveLength(2);
  });
});
```

If ALS is not initialized, `TenantContext.tenantId` returns `undefined` and `requireTenantId()` throws.

### Integration tests — wrap in `runWithRequestContext`

```typescript
import { runWithRequestContext } from '@shared/tenant-context-als';

describe('POST /alarms', () => {
  it('creates an alarm for the calling tenant', async () => {
    await runWithRequestContext({ tenantId: 'tenant-1', userId: 'user-1' }, async () => {
      const res = await request(app).post('/alarms').send({ /* ... */ });
      expect(res.status).toBe(201);
    });
  });
});
```

## Prisma mocks

`setupTests.ts` mocks `@users/custom-prisma-client`. Use `jest.requireMock('src/main/users/prismaClient')` to access mock helpers and call `resetPrismaMocks()` between tests (already done by `setupTests.ts#beforeEach`).

```typescript
import prisma from '@users/custom-prisma-client';

it('queries by tenant', async () => {
  (prisma.alarm.findMany as jest.Mock).mockResolvedValue([{ id: 'a1' }]);
  const result = await alarmService.list();
  expect(result).toEqual([{ id: 'a1' }]);
});
```

**Never** import a real `PrismaClient` in a unit test. **Always** mock `@users/custom-prisma-client`.

## TDD workflow (Red → Green → Refactor)

```bash
# 1. Write failing test FIRST
npm run test -- --testPathPattern="<file>"

# 2. Implement minimal code to pass

# 3. Refactor with tests green

# 4. Re-run full suite before claiming done
npm run test
```

## Commands

| Command                                                            | Purpose                            |
|--------------------------------------------------------------------|------------------------------------|
| `npm run test`                                                     | All tests (unit + integration)     |
| `npm run test -- --testPathPattern="unit"`                         | Unit tests only                    |
| `npm run test -- --testPathPattern="integration"`                  | Integration tests only             |
| `npm run test -- --testPathPattern="auth.service"`                 | One file                           |
| `npm run test -- --testPathPattern="auth.service\|account.service"` | Multiple files (regex alternation) |
| `npm run test:cov`                                                 | With coverage report               |
| `npm run test:watch`                                               | Watch mode                         |

## Edge cases to cover

Every test file should include cases for:
- Empty input (`null`, `undefined`, `[]`, `{}`)
- Malformed input (wrong type, missing required fields)
- Boundary conditions (0, max value, off-by-one)
- Success path
- Error path (rejection, timeout, Prisma throw)

## Anti-patterns

- `jest.mock('jose')` directly in test files — use the moduleNameMapper.
- `await mongoose.connect(...)` outside `setupTests.ts` — the global setup handles it.
- Importing real `PrismaClient` in unit tests — always mock `@users/custom-prisma-client`.
- Running `MongoMemoryServer` on parallel workers — set `maxWorkers: 1`.
- Skipping the ALS setup in integration tests — you'll get `Missing tenantId` errors.
- Re-importing `@shared/security/provider-token-verifier` per file — the global mock in `setupTests.ts` covers everything.