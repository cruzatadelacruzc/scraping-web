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
- Queue operations use Bull/Arena

### DTOs
- Zod schemas with `z.infer<typeof>` for type inference
- Static `from()` factory method for parsing request bodies

### Mappers
- Pure functions, side-effect free
- Transform DB models ↔ DTOs ↔ API responses
- No business logic, no DB/queue access

## Queue System

- Queues implement `IQueueModule` interface (`readonly queues: string[]`)
- Job handlers: `process(job: Job<T>): Promise<void>`
- Report progress: `job.progress(percentage)`
- Log errors with job context before throwing
- Bull Arena dashboard at `/arena` (auth via `BULL_BOARD_USER`/`BULL_BOARD_PASSWORD`)

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
- Integration test using `runWithRequestContext({ tenantId, userId }, async () => { ... })`
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

### Testing Rules
- **Unit tests**: Mock tenant context and external dependencies
- **Integration tests**: Use `runWithRequestContext` for tenant-scoped features
- Test tenant isolation explicitly
- Mock ESM modules (`jose`) before import — see `src/__tests__/unit/user.service.registerLocal.test.ts`

## File Organization

- Group by feature/domain (users, alarms, scrapers, etc.)
- Use barrel files (`index.ts`) for clean exports
- Tests mirror source structure in `src/__tests__/`
- File naming: `*.service.ts`, `*.controller.ts`, `*.repository.ts`

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

- Bull Arena dashboard for queue monitoring
- Structured logging with request/tenant context
- OpenAPI/Swagger docs at `/api-docs`
