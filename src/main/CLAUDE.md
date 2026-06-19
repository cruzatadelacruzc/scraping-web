---
description: 'Code patterns for src/main: DI, layers, queues, logging, file organization'
applyTo: 'src/main/**'
---

# Code Patterns — src/main

## Architecture Layers

### Controller
- `inversify-express-utils` decorators (`@controller`, `@httpGet`, `@httpPost`)
- Validate requests with Zod DTOs via `ValidateRequestMiddleware.with(DTO)`
- No business logic — only request handling and response shaping via `ResponseHandler`

### Service
- Implements business logic and orchestration
- Must inject `ILogger` and necessary repositories/adapters
- Operates on domain models and typed DTOs

### Repository / Adapter
- Handles all external interactions (DB, queues)
- Enforces tenant isolation via Prisma client extensions
- Queue operations go through the `IQueueAdapter` port (BullMQ / Mock / SQS)

### DTOs
- Zod schemas with `z.infer<typeof>` for type inference
- Static `from()` factory method for parsing request bodies

### Mappers
- Pure functions, side-effect free
- Transform DB models ↔ DTOs ↔ API responses
- No business logic, no DB/queue access

## Queue System

- Queues implement `IQueueModule` interface (`getQueuesToInitialize()`, `getProcessor()`, `setupQueueListeners()`)
- Job handlers receive a backend-agnostic `IJobContext<TData>` (id, name, data, attemptsMade, log, progress)
- Report progress: `ctx.progress(value)` (0-100 or structured object)
- Log errors with job context before throwing
- Active adapter selected by `QUEUE_BACKEND` env var (`bullmq` | `sqs` | `mock`); see `src/main/shared/queue/`
- Queue Dashboard (`@bull-board/api`) mounted at `/queue` (configurable via `BULL_AREANA_URL`)

## Development Standards

### Logging
```typescript
constructor(@inject(TYPES.Logger) private _log: ILogger) {
  this._log.context = ClassName;
}
```
Include `tenantId`, `requestId`, and operation details in log calls.

### Error Handling
- Use domain-specific error classes
- Log errors with full context before throwing
- Consistent error responses via `ResponseHandler`

### TDD Workflow (Red → Green → Refactor)

**Red** — Write tests first, before any production code:
- Unit tests for Service and Repository with mocked dependencies
- Integration test using `runWithRequestContext({ tenantId, userId }, async () => { ... })` — see `.claude/skills/testing/SKILL.md`
- Place tests under `src/__tests__/unit/` and `src/__tests__/integration/`
- Run with `npm run test -- --testPathPattern="feature"` — expect failures

**Green** — Minimal implementation to pass tests:
- DTOs → Mappers → Repository → Service → Controller
- Use Inversify DI, ensure `TenantContext` is consumed where needed
- Re-run tests; iterate until green

**Refactor** — Clean up without breaking tests:
- Remove duplication, add JSDoc for public methods, refine types
- Ensure mappers are pure
- Run `npm run lint` and `npm run format`; fix any issues
- Re-run tests to confirm green
- For MongoDB features, tenant isolation does NOT apply (product data is shared)

> See skill: `.claude/skills/testing/SKILL.md` for the full testing patterns (Jest, MongoMemoryServer, Prisma mocks, ALS mocks, ESM jose moduleNameMapper workaround). Follow strictly.

## File Organization

- Group by feature/domain (users, alarms, scrapers, etc.)
- Use barrel files (`index.ts`) for clean exports
- Tests mirror source structure in `src/__tests__/`
- File naming conventions: see `.claude/rules/compliance-checklist.md` "File naming (canonical suffixes)" section.

## Creating New Components

1. Add Symbol to `types.container.ts`
2. Create interfaces/types
3. Implement class with `@injectable()` and `@inject()` decorators
4. Register in `container.ts`
5. Add unit and integration tests

## Coding Constraints

- Public methods require JSDoc and explicit access modifiers
- Avoid `any` unless justified with a one-line comment
- No `console.log` — use injected `ILogger` (except in `bootstrap.ts` where logger is unavailable)
- Add `TODO` comments for product-owner decisions (pricing rules, feature flags, etc.)
- Never fetch or store secrets

## Debugging & Monitoring

- Queue Dashboard (`@bull-board`) at `/queue` for monitoring BullMQ queues
- Structured logging with request/tenant context
- OpenAPI/Swagger docs at `/api-docs`

## API Documentation

### Workflow

After developing and passing tests, ALWAYS run `npm run docs:generate`. This regenerates `swagger.json` from the Zod DTOs and path definitions in `src/main/docs/`. The command must run after any change to DTOs, controllers, or new endpoints.

### Scripts

- `npm run docs:generate` — generates `swagger.json` from `src/main/docs/`
- `npm run docs:validate` — CI: diffs current `swagger.json` vs generated, fails if out of sync

### Tool

- `@asteasolutions/zod-to-openapi@^7.0.0` (NOT v8 — v8 requires Zod v4, this project uses Zod v3)
- `ts-node` needs `-O '{"types":["node"]}'` for built-ins (fs, path)

### Architecture

- OpenAPI metadata centralized in `src/main/docs/schema-registry.ts` — DTOs are NEVER modified
- Paths defined in `src/main/docs/modules/*.paths.ts` (9 files, one per module)
- For `$ref` in paths use the return value of `registry.register()`, not the raw Zod schema
- `tsconfig.build.json` excludes `src/main/docs/**` — code only used at build time

### Special schemas

- Scraper DTOs do not export their Zod schemas → inline OpenAPI schemas in the registry
- `AlarmResponseDTO` and `NotificationDTO` use `fromModel()` → complementary schemas in schema-registry

### Path aliases

`@users/*`, `@alarms/*`, `@shared/*`, `@admin/*`, `@scrapers/*`, `@config/*`, `@utils/*`
