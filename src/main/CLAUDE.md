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

### Scraper Module

- `src/main/scrapers/` — multi-store scraping architecture with enrichment pipeline.
- See `src/main/scrapers/CLAUDE.md` for scraper-specific patterns (extraction, storage, analytics, attributes, LLM integration).

### Cron Module

- `src/main/cron/` — automated scraping scheduler. See `.claude/skills/cron-scheduler/SKILL.md` for agent instructions.
- **StoreRegistry** (`store-registry.ts`): in-memory `Map<storeKey, IStoreConfig>`. Each store module calls `register()` at bootstrap; the scheduler resolves `store → queueName` via `get()`. Stores also publish a `jobSchema` (field descriptors) so the admin dashboard can render dynamic forms per store.
- **CronSchedulerService** (`services/scheduler.service.ts`): node-cron runtime. Maintains a `Map<scheduleId, ScheduledTask>`. On tick: resolves store → queue, enqueues each job with error isolation, best-effort updates `lastRunAt`. Uses `require('node-cron')` with an inline type cast — the `.d.ts` at `src/main/types/node-cron.d.ts` works for `tsc` but not `ts-node-dev`.
- **ScheduleService** (`services/schedule.service.ts`): CRUD orchestration. Every write (create/update/delete/toggle) syncs the in-memory scheduler immediately — no restart needed.
- **ScheduleController**: REST endpoints at `/api/admin/scraping-schedules` and `/api/admin/stores`. All `SUPER_ADMIN` only. Endpoint details are in `swagger.json` (tag: `Admin - Scraping Schedules`).
- **ScrapingSchedule** model (Prisma): `name`, `store`, `cron`, `enabled`, `jobs` (JSON array — opaque to the scheduler, each store interprets its own shape), `lastRunAt`. No tenant isolation (no `accountId`).
- **DI**: 6 symbols in `types.container.ts` + bindings in `container.ts` (`StoreRegistry`, `CronSchedulerService`, `ScheduleService`, `ScheduleRepository`, `ScheduleController`, `StoreInfoController`).
- **Adding a store**: create `scrapers/<store>/index.ts` with a `register<Store>Store(container)` function that calls `storeRegistry.register(key, config)`. Call it in `app.ts` before `scheduler.initialize()`.

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
- Paths defined in `src/main/docs/modules/*.paths.ts` — one file per module. **When adding a new module with controllers**: (a) register its Zod DTO schemas in `schema-registry.ts`, (b) create `<module>.paths.ts` using `endpoint()` from `helpers/path-builder`, and (c) import and call it in `path-registry.ts`.
- For `$ref` in paths use the return value of `registry.register()`, not the raw Zod schema
- `tsconfig.build.json` excludes `src/main/docs/**` — code only used at build time

### Special schemas

- Scraper DTOs do not export their Zod schemas → inline OpenAPI schemas in the registry
- `AlarmResponseDTO` and `NotificationDTO` use `fromModel()` → complementary schemas in schema-registry

### Path aliases

`@users/*`, `@alarms/*`, `@shared/*`, `@admin/*`, `@scrapers/*`, `@config/*`, `@utils/*`, `@cron/*`

### Email Service

`IEmailService` (`src/main/users/services/email/email.service.interface.ts`) with two implementations selected via `EMAIL_PROVIDER` env var:
- `MockEmailService` — logs emails to `ILogger` (development, default when unset)
- `SmtpEmailService` — sends via nodemailer with SMTP (Gmail or any provider)

Emails are NOT sent synchronously — services enqueue an `EMAIL_SEND_JOB` on BullMQ and the `EmailQueues` worker dispatches to `IEmailService.send()`. This provides retry with backoff. Template rendering is handled by the pure-static `EmailTemplateService`.

SMTP env vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`.

### Token Management

`TokenManagementService` (`src/main/users/services/token-management.service.ts`) manages refresh token lifecycle:
- **Issue**: generates opaque 96-hex-char random token, stores SHA-256 hash in `RefreshToken` model, 30-day expiry
- **Rotate**: validates incoming token, revokes old, issues new in same family. If an already-replaced token is presented (possible theft), the entire family is revoked
- **Revoke all**: called on password change and account deactivation

`TokenService.generateToken()` now includes a `jti` (JWT ID, UUID v4) claim for per-token blacklisting on logout. The `ITokenPayload` interface also carries the `exp` claim.

### Rate Limiting

`LoginRateLimitService` follows the same Redis fail-open pattern as `BotRateLimitService`. Counters per IP and per username, with lock after exceeding thresholds. All checks fail-open (allow) if Redis is unavailable.

### Account Soft-Delete

`AccountDeactivationService` at `src/main/users/services/account-deactivation.service.ts`:
- Sets `User.deletedAt`, pauses all alarms (`enabled = false`), revokes all refresh tokens, blacklists current JWT
- Reversible within 30 days by `SUPER_ADMIN` via `POST /api/auth/reactivate`
- **Reactivation** re-enables all alarms that were paused during deactivation
- `purgeExpiredAccounts()` hard-deletes personal data after 30 days (run as daily cron). Alarm/account data is preserved.

### Plan & Subscription System

Three plans are seeded idempotently via `prisma/seed.ts`:

| Plan | Price | Max Alarms | Conditions | AI | Channels |
|---|---|---|---|---|---|
| Trial | $0 | 3 | Price Drops, Price Rises, Price Change % | No | In-app |
| Standard | $9.99 | 20 | All 6 | No | In-app, Email |
| Unlimited | $29.99 | -1 (unlimited) | All 6 | Yes | All |

**Plan.features (JSONB)** — the runtime enforcement layer reads these keys:
- `maxAlarms` — max alarms per account. `-1` = unlimited.
- `allowedConditions` — array of `AlarmConditionType` strings the plan permits. Empty/missing = all allowed.
- `aiAlarms` — boolean gate for AI-powered conditions.
- `notificationChannels` — which delivery channels the plan includes.

**Auto-trial**: `AccountService.register()` auto-assigns a 7-day TRIAL subscription. Fail-open — never blocks registration if the TRIAL plan is missing or creation fails.

**PlanEnforcementService** — gates `AlarmService.create()` and `update()`:
1. Counts existing alarms vs `maxAlarms`. Throws `PlanLimitReachedError` (403) if limit reached.
2. Validates condition type against `allowedConditions`. Throws `ConditionNotAllowedError` (403) if not permitted.
3. Injects `SubscriptionsRepository` directly (not `SubscriptionsService`) — needs raw Prisma models with nested `plan.features` JSONB that the DTO/mapper layer strips.

**Subscription lifecycle**: `TRIALING` → `ACTIVE` → `PAST_DUE` / `CANCELED`. Only ACTIVE and TRIALING are considered active for enforcement.

**Cascade deletes**: Account deletion cascades to Users, Subscriptions, Alarms (→ AlarmHistory), Notifications, BotLinkCodes, BotLinkAudits, BotConversations. User deletion cascades to UserIdentities, RefreshTokens, PasswordResetTokens, EmailVerificationTokens.

See `src/main/users/README.md` and `src/main/alarms/README.md` for full conceptual documentation.

### DI: Always Use TYPES Symbols

Every `@inject()` MUST use `TYPES.SymbolName`, never a class reference. The container binds Symbols — Inversify treats class constructors and Symbols as distinct identifiers:

```typescript
// Correct — matches container.bind(TYPES.SubscriptionsService).to(SubscriptionsService)
@inject(TYPES.SubscriptionsService) private readonly _subs: SubscriptionsService

// Wrong — no matching binding (container has Symbol, not class)
@inject(SubscriptionsService) private readonly _subs: SubscriptionsService

// Exception: repositories use .toSelf() pattern, so inject by class
@inject(UserRepository) private readonly _userRepo: UserRepository
```

The repo has a mix: **services are bound by Symbol** (`container.bind(TYPES.X).to(X)`), **repositories are bound by class** (`container.bind(RepoName).toSelf()`). Match the binding: services → `@inject(TYPES.X)`, repositories → `@inject(ClassName)`.
