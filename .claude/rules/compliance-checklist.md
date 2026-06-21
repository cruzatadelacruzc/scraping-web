---
description: 'Pre-merge compliance checklist — actionable rules agents MUST verify before completing any task. Each item explains what to do, not just what to check.'
applyTo: '**'
---

# Compliance Checklist — Agent Rules

These rules apply to **all** work in this repository. Agents MUST verify each item before declaring a task complete. The format is `[ ] item — actionable guidance` so each checkbox tells you exactly what to do, not just what to look for.

Related references:

- Folder structure: `.claude/rules/folder-structure.md`
- Meta-workflow: `.claude/rules/meta-workflow.md`
- Auth/tenant: `.claude/skills/security/SKILL.md`
- Testing: `.claude/skills/testing/SKILL.md`
- TypeScript patterns: `.claude/skills/typescript-best-practices/SKILL.md`

## Code Standards

### TypeScript

- [ ] **Strict mode enabled** — `tsconfig.json` has `"strict": true`. Verify with `npx tsc --noEmit`.
- [ ] **No implicit `any`** — every variable has an explicit type or is inferred from a typed source.
- [ ] **No unjustified `any`** — if `any` is unavoidable, add `// eslint-disable-next-line @typescript-eslint/no-explicit-any` with a one-line justification. Prefer `unknown` and narrow with type guards.
- [ ] **Generic names are descriptive** — `TData`, `TResponse`, `TRequest` over bare `T`. Bare `T` is allowed only in single-letter private helpers.

### File naming (canonical suffixes)

- [ ] `*.service.ts` for business logic in `services/`
- [ ] `*.controller.ts` for Express controllers (inversify-express-utils) in `controllers/`
- [ ] `*.repository.ts` for DB access in `repositories/`
- [ ] `*.dto.ts` for DTOs in `services/dto/`
- [ ] `*.error.ts` for domain error classes in `errors/`
- [ ] `*.mapper.ts` for pure model ↔ DTO converters in `mappers/`
- [ ] `*.interface.ts` for pure interface class
- [ ] `*.middleware.ts` for module-specific middleware in `controllers/middleware/`
- [ ] `*.model.ts` for Mongoose models in `models/`
- [ ] `*.util.ts` for pure helpers in `utils/`
- [ ] `*.test.ts` colocated or in `src/__tests__/`

### Imports

- [ ] **Order**: types → interfaces → implementations (alphabetical within each group).
- [ ] **Barrel files** (`index.ts`) used for clean re-exports; never deep-import a file inside another file's directory.
- [ ] **Path aliases** — use `@users/...`, `@alarms/...`, `@shared/...` etc. Never relative imports across module boundaries (`../../../shared/...`).
- [ ] **No circular dependencies** — verify with `madge --circular src/main` (run only if uncertain; the project doesn't currently enforce this).

## Architecture & Patterns

### Inversify DI

- [ ] Every `service`, `controller`, `repository`, and adapter class is decorated with `@injectable()`.
- [ ] Constructor parameters use `@inject(TYPES.X)` for every dependency. No bare `private readonly _foo: Foo` — always inject.
- [ ] **New bindings** added to `src/main/shared/types.container.ts` (Symbol) AND registered in `src/main/shared/container.ts` (`.to(MyClass)`).
- [ ] **No direct instantiation** in business code — only in `container.ts` (composition root) and test files.

### Layers (Controller → Service → Repository)

- [ ] Controllers contain NO business logic — only request validation, role check via `AuthMiddleware.forRoles`, and response shaping via `ResponseHandler`.
- [ ] Services orchestrate repositories and adapters — they NEVER call Prisma/Mongoose directly. The only exception is `TenantContext` injection (which reads ALS, not the DB).
- [ ] Repositories handle ALL DB and queue access. If you find yourself writing `prisma.x.findMany(...)` inside a service, move it to a repository.
- [ ] DTOs in `services/dto/` are Zod schemas with `z.infer<typeof>` for the TS type. Add a static `from(body): DTO` factory that calls `schema.parse(body)`.
- [ ] Mappers in `mappers/` are PURE functions (no DB, no queue, no logger). They take a model and return a DTO, or vice versa.

### Folder structure

- [ ] New modules follow the canonical layout described in `.claude/rules/folder-structure.md`.
- [ ] Subdirectories are created ONLY when there are files to place in them — no empty folders.
- [ ] When adding the first middleware to a module that lacks `controllers/middleware/`, create the folder rather than putting the file at `controllers/`.

## Multi-Tenancy & Security

### Tenant context

- [ ] Every controller route goes through `tenantInitMiddleware` THEN `AuthMiddleware`. Verify in `src/main/app.ts` (or wherever routes are wired).
- [ ] Never store tenant-specific data in module-level scope (only in ALS). Module-level vars would leak across requests.
- [ ] All DB queries filter by `accountId` / `tenantId` automatically via Prisma client extensions. Don't pass `where: { accountId }` manually — the extension does it.
- [ ] For MongoDB features, tenant isolation does NOT apply (product data is shared across tenants).

### Auth

- [ ] Protected routes use `AuthMiddleware.forRoles(...)` (auth + role check in one pass) or `TYPES.AuthMiddleware` (auth only).
- [ ] `SUPER_ADMIN` automatically passes any `forRoles()` check. Don't add `|| req.user.roles.includes('SUPER_ADMIN')` — it's already handled.
- [ ] Never read `req.user` outside an `AuthMiddleware`-protected route.
- [ ] `JWT_SECRET` is loaded from `process.env.JWT_SECRET`. The app throws at boot if missing. Never hardcode a fallback secret.

### Logging

- [ ] Every class that depends on `ILogger` sets `this._log.context = ClassName` in its constructor.
- [ ] Log calls include `tenantId`, `requestId` (when in a request scope), and operation details.
- [ ] Errors are logged with full context BEFORE throwing or responding — never `throw new Error('boom')` without a log call.
- [ ] No `console.log` in business code — use injected `ILogger`. Exception: `src/main/bootstrap.ts` (logger unavailable at boot).

## Testing

### Unit tests

- [ ] Test files mirror source structure: `src/__tests__/unit/<module>/<file>.test.ts`.
- [ ] External dependencies are mocked: `prisma`, `mongoose`, queue adapters, `token.service`, etc.
- [ ] Tenant context is mocked via `setupTests.ts` — if a unit test needs a specific tenantId, wrap the call in `runWithRequestContext(...)`.
- [ ] Test cases cover: empty input, malformed input, boundary conditions, success path, error path.

### Integration tests

- [ ] Code under test is wrapped in `runWithRequestContext({ tenantId, userId }, async () => { ... })` so ALS has the correct tenant.
- [ ] `MongoMemoryServer` is used (auto-started by `globalSetup.ts`) — never connect to a real Mongo from tests.
- [ ] Mocks are reset in `beforeEach`: `resetMockTenantId()` (done by `setupTests.ts`). Prisma is REAL in integration tests — see prerequisites below.
- [ ] Tenant isolation is tested explicitly — write at least one test that proves another tenant's data is NOT visible.

#### Prerequisites — docker-compose stack

Integration tests that exercise the App end-to-end (`account-register`, `scraping-jobs-authz`, `test-reset`, etc.) insert rows via raw SQL (`pgDb.query(...)`) and read them back through Prisma. **Postgres must be reachable on `TENANT_DB_URL`.** Run `docker-compose up -d postgres` (or the full stack) before `npm run test`. Verify with `pg_isready` or `psql "${TENANT_DB_URL}" -c 'select 1'`. After the run, `docker-compose down` is optional but recommended to free ports — volumes persist unless you pass `-v` (irreversible).

What is mocked and what is real in integration tests:

| Subsystem | In tests | Why |
|---|---|---|
| MongoDB | Mocked via `MongoMemoryServer` (in-process) | `globalSetup.ts` |
| BullMQ / Redis | Mocked via `QUEUE_BACKEND=mock` (`src/__tests__/setup-env.ts`) | `jest.config.js#setupFiles` |
| PostgreSQL | **REAL** (docker-compose required) | Integration tests use raw SQL |
| Prisma | **REAL** (no global mock) | Unit tests that need a mock provide their own factory inline |

See @../skills/docker-dev/SKILL.md for the docker-compose workflow and @../skills/testing/SKILL.md for the test environment breakdown.

### TDD workflow

- [ ] Failing test written FIRST, before any production code.
- [ ] Watch the test fail for the right reason before implementing (catches wrong-import or wrong-fixture issues).
- [ ] Implement minimal code to pass the test.
- [ ] Refactor only after tests are green.
- [ ] Re-run the full suite (`npm run test`) before claiming done.

## Queue & Background Jobs

### Queue registration

- [ ] Every queue is declared in an `IQueueModule` implementation (see `src/main/shared/queue/`).
- [ ] `getQueuesToInitialize()` returns the queue names.
- [ ] `getProcessor(queueName)` returns the handler.
- [ ] `setupQueueListeners()` wires events to services.

### Job handlers

- [ ] Signature is `async process(job: Job<TData>): Promise<void>` (or use the backend-agnostic `IJobContext<TData>` wrapper).
- [ ] Use `IJobContext<TData>` for progress and logging — keeps the handler portable across BullMQ / SQS / Mock.
- [ ] Report progress via `ctx.progress(value)` (0-100 or a structured object).
- [ ] Errors are logged with job context BEFORE throwing — this enables retries with diagnostic context.
- [ ] `attempts`, `backoff`, and `removeOnComplete` are configured per queue.

## Documentation

### Code

- [ ] JSDoc on all public methods with `@param`, `@returns`, `@throws` if applicable.
- [ ] `@example` block for non-obvious usage.
- [ ] `TODO` comments for product-owner decisions (pricing rules, feature flags) — never silently invent behavior.

### API docs

- [ ] After any change to DTOs, controllers, or new endpoints: run `npm run docs:generate` and commit the updated `swagger.json`.
- [ ] OpenAPI metadata lives in `src/main/docs/schema-registry.ts` — DTOs are NEVER modified for OpenAPI reasons.
- [ ] For `$ref` in paths use the return value of `registry.register('SchemaName')`, never the raw Zod schema.
- [ ] CI runs `npm run docs:validate` to catch `swagger.json` drift. A failed check means the agent forgot to regenerate.

## Quality gates (run before committing)

Run before `git commit`. The husky pre-commit hook (`.husky/pre-commit` →
`lint-staged` in `package.json`) is a **safety net**, not a substitute.

- [ ] `docker-compose up -d postgres` is running (integration tests need real Postgres). See "Prerequisites" under Integration tests above.
- [ ] `npm run lint` passes with zero errors.
- [ ] `npm run format && git diff --stat` is empty — prettier is separate
      from eslint; `lint:fix` does NOT run prettier.
- [ ] `npm run test` passes (unit + integration). Confirm the final lines show `Ran all test suites.` with no `Jest did not exit` warning.
- [ ] `npm run docs:generate` produces no diff (if DTOs/controllers/paths changed).
- [ ] `npm run build` succeeds.
- [ ] `git diff --name-only` shows only files relevant to the task.

Files outside `src/**/*.{js,ts}` (`*.md`, `swagger.json`, `package.json`,
`prisma/**`) are NOT auto-formatted by the husky hook — run `npm run format`
manually. If the hook modifies staged files, the commit aborts; re-stage with
`git add -u` and commit again.
