---
name: testing
description: 'Project-specific testing patterns: Jest + ts-jest, MongoMemoryServer (in-process, version 4.4.22), AsyncLocalStorage tenant-context-als mocks, ESM jose moduleNameMapper workaround, runWithRequestContext for tenant-scoped integration tests, and the docker-compose prerequisite for the Postgres that integration tests use via raw SQL + real Prisma. Use when writing or reviewing tests for the BazaarSentinel project.'
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
├── setup-env.ts          # runs in jest.config.js#setupFiles — sets QUEUE_BACKEND=mock
├── setupTests.ts         # jest.mock for provider-token-verifier + ALS reset, mongoose connect/disconnect
├── unit/                 # *.test.ts — mirrors src/main/<module>/<filename>.test.ts
├── integration/          # *.test.ts — full-stack flows (require docker-compose for Postgres)
└── __mocks__/
    ├── jose.ts                       # CJS stub for ESM jose module
    └── src/main/users/
        └── custom-prisma-client.ts   # available Prisma mock (NOT auto-applied; tests opt in)
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
  setupFiles:       ['<rootDir>/src/__tests__/setup-env.ts'],     // runs before module load — sets QUEUE_BACKEND=mock
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setupTests.ts'],  // runs after Jest is set up — mocks + mongoose
  openHandlesTimeout: 30000,                                      // wait up to 30s for Postgres/Prisma sockets to close
  coverageProvider: 'v8',
};
```

Key points:
- `maxWorkers: 1` — `MongoMemoryServer` shares one in-process instance. Running parallel workers produces cross-test pollution.
- `moduleNameMapper` order matters: specific patterns (`^jose$`) must come BEFORE generic path alias patterns, otherwise the alias wins.
- `setupFiles` (runs before any module is loaded) sets `QUEUE_BACKEND=mock` so the DI container picks the in-memory `MockQueueAdapter` instead of opening real Redis/BullMQ connections.
- `setupFilesAfterEnv` runs `setupTests.ts` which wires the global `jose`/`provider-token-verifier` mock and connects mongoose to `MongoMemoryServer`.
- `openHandlesTimeout: 30000` — without this, Jest gives up at the default 1s and prints `Jest did not exit one second after the test run has completed.` because real Postgres + Prisma sockets take longer than 1s to close gracefully.

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

Prisma is **not** mocked globally. `setupTests.ts` only mocks `@shared/security/provider-token-verifier` (for the ESM `jose` workaround) and resets the ALS mock between tests.

The mock file at `src/__tests__/__mocks__/src/main/users/custom-prisma-client.ts` provides a `jest.fn()`-backed stub for every model (`account`, `accountSubscription`, `alarm`, `alarmHistory`, `notification`, `plan`, `role`, `user`, `userIdentity`) plus `$transaction`, `$extends`, `$use`, `$connect`, `$disconnect`. It is **available** but not auto-applied — tests that need a mocked Prisma must opt in by adding their own `jest.mock('@users/custom-prisma-client', () => ({ ... }))` at the top of the file (the factories vary per test).

**Integration tests** use the real Prisma against the real Postgres in `docker-compose`. They must NOT add `jest.mock('@users/custom-prisma-client')` — `account-register`, `scraping-jobs-authz`, `test-reset` insert rows via raw SQL (`pgDb.query(...)`) and expect Prisma to read them back.

Common unit-test pattern (inline factory):

```typescript
jest.mock('@users/custom-prisma-client', () => ({
  __esModule: true,
  default: {
    user: { findFirst: jest.fn() },
    account: { findUnique: jest.fn() },
    // ...only the methods this test exercises
  },
  isPrismaUniqueConstraintError: jest.fn(),
}));
```

See `src/__tests__/unit/auth.middleware.test.ts`, `user.service.registerLocal.test.ts`, and `userRegisterWithProvider.test.ts` for full examples.

**Never** import a real `PrismaClient` in a unit test. **Always** mock `@users/custom-prisma-client` with an inline factory in unit tests.

## Integration test prerequisites

Integration tests run the full App stack. They require a running **Postgres** instance (the others are mocked in-process):

```bash
# Before npm run test
docker-compose up -d                    # or `up -d postgres` to skip Redis/Mongo
pg_isready                              # confirm Postgres is accepting connections

# Run the suite
npm run test

# After
docker-compose down                     # optional — keeps volumes
```

What's mocked vs. real in integration tests:

| Subsystem  | In tests | Why |
|------------|----------|-----|
| MongoDB    | `MongoMemoryServer` (in-process) | `globalSetup.ts` |
| BullMQ / Redis | `MockQueueAdapter` (in-process) | `setup-env.ts` sets `QUEUE_BACKEND=mock` |
| PostgreSQL | **REAL** (raw SQL + Prisma) | `docker-compose up -d postgres` |
| Prisma     | **REAL** | Same — no global mock (see "Prisma mocks" above) |

A test run is **not** considered clean if Jest prints `Jest did not exit one second after the test run has completed.` — that means real Postgres/Prisma sockets didn't close within the default 1s. `openHandlesTimeout: 30000` in `jest.config.js` already raises this to 30s. If you still see the warning, check `App.close()` (in `src/main/app.ts`) and the integration test's `afterAll` to confirm `await appInstance.close()` is called.

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