---
name: cron-scheduler
description: Use when editing files under src/main/cron/ or adding automated scraping schedules — covers StoreRegistry multi-store registration, CronSchedulerService (node-cron) patterns, generic JSON jobs, and the node-cron require() type cast gotcha.
---

# Cron Scheduler — Agent Instructions

## Module structure

```
src/main/cron/
├── store-registry.ts                  # IStoreConfig, IFieldSchema, Map<key, config>
├── controllers/
│   └── schedule.controller.ts         # ScheduleController + StoreInfoController
├── services/
│   ├── dto/                           # Zod DTOs (jobs: z.object({}).passthrough())
│   ├── schedule.service.ts            # CRUD + hot re-registration
│   └── scheduler.service.ts           # node-cron runtime
├── repositories/
│   └── schedule.repository.ts         # Prisma CRUD + updateLastRunAt
├── mappers/
│   └── schedule.mapper.ts             # toScheduleResponseDTO
└── errors/
    └── schedule-not-found.error.ts
```

Related: `src/main/types/node-cron.d.ts` (ambient types, found by `tsc`), `src/main/scrapers/<store>/index.ts` (store registration).

## StoreRegistry

In-memory `Map<string, IStoreConfig>`. Each store module calls `register()` at bootstrap. The scheduler resolves `store → scrapingQueue` at tick time.

```typescript
// IStoreConfig shape
interface IStoreConfig {
  displayName: string;      // "Revolico"
  scrapingQueue: string;    // "PRODUCTS_SCRAPING"
  jobSchema: {
    fields: IFieldSchema[]; // drives dynamic admin-dashboard forms
  };
}
interface IFieldSchema {
  name: string;             // "category"
  type: 'string' | 'number' | 'boolean';
  required: boolean;
  label: string;            // "Categoría"
  placeholder?: string;
}
```

`list()` returns `Array<{ key: string } & IStoreConfig>` — consumed by `GET /api/admin/stores` for the admin dashboard.

## CronSchedulerService

node-cron v3 runtime. Maintains a `Map<string, CronScheduledTask>`.

### node-cron import (GOTCHA)

ts-node-dev cannot resolve the ambient `.d.ts` at `src/main/types/node-cron.d.ts`. The service uses `require()` with an inline type cast:

```typescript
type CronScheduledTask = { start(): void; stop(): void };

// eslint-disable-next-line @typescript-eslint/no-require-imports
const cron = require('node-cron') as {
  schedule(expression: string, func: () => void, opts?: { scheduled?: boolean; timezone?: string }): CronScheduledTask;
};
```

When writing tests, mock `node-cron` as `{ schedule: jest.fn() }` (plain object, no `__esModule`/`default` wrapper — the `require()` returns the mock directly).

### Lifecycle

- **`initialize()`**: reads all enabled schedules from repo, calls `register()` for each. Called once at bootstrap (`app.ts`).
- **`register(schedule)`**: stops any existing task for the same id, then if enabled calls `cron.schedule(cronExpr, onTick)`.
- **`unregister(id)`**: stops and removes the task. No-op for unknown ids.
- **`shutdown()`**: stops all tasks, clears map. Called in `App.close()`.

### onTick flow

1. Resolve `storeRegistry.get(schedule.store).scrapingQueue` → queueName
2. For each job in `schedule.jobs` (cast as `Array<Record<string, unknown>>`): enqueue via `QueueContext` with `{ attempts: 2, backoff: 5000 }` in a try/catch — one failing job does NOT block siblings
3. Best-effort `repo.updateLastRunAt(id)` — failure is silently swallowed

Invalid cron expressions are caught in `register()` (logged, don't throw).

## ScheduleService

CRUD orchestration. Every write method syncs the scheduler immediately:

| Method | Scheduler call |
|--------|---------------|
| `create(dto)` | `scheduler.register(row)` |
| `update(id, dto)` | `scheduler.register(row)` |
| `delete(id)` | `scheduler.unregister(id)` |
| `toggle(id)` | `scheduler.register(row)` |

No restart needed — changes take effect on the next tick.

## ScrapingSchedule model (Prisma)

| Field | Type | Notes |
|-------|------|-------|
| `name` | String `@unique` | Human-readable label |
| `store` | String | Key resolvable by StoreRegistry |
| `cron` | String | Standard 5-field cron expression |
| `enabled` | Boolean | Toggled via PATCH; scheduler skips disabled |
| `jobs` | Json | Array of store-specific objects — opaque to the scheduler |
| `lastRunAt` | DateTime? | Best-effort metadata, updated after each tick |

No `accountId` — tenant isolation does NOT apply. SUPER_ADMIN only.

## Generic JSON jobs

DTOs use `z.array(z.object({}).passthrough()).min(1)`. The scheduler never inspects job fields — it passes them through to the queue. Each store module interprets its own shape.

Revolico jobs: `{ category: string, subcategory?: string, pageNumber?: number, totalPages?: number }`.

## Adding a new store

3 steps:

1. **Create `src/main/scrapers/<store>/index.ts`** with a `registerXxxStore(container)` function calling `storeRegistry.register(key, config)`. The `jobSchema.fields` array defines what the admin dashboard renders.
2. **Call it in `app.ts`** before `scheduler.initialize()`.
3. **Add the store's scraping queue** to its `IQueueModule` implementation if it doesn't already exist.

## DI pattern

Add Symbol to `types.container.ts`, binding to `container.ts`. Bind `StoreRegistry` and `CronSchedulerService` in singleton scope.

```typescript
// types.container.ts
StoreRegistry: Symbol.for('StoreRegistry'),
CronSchedulerService: Symbol.for('CronSchedulerService'),

// container.ts
container.bind<StoreRegistry>(TYPES.StoreRegistry).to(StoreRegistry).inSingletonScope();
container.bind<CronSchedulerService>(TYPES.CronSchedulerService).to(CronSchedulerService).inSingletonScope();
```

## Cross-references

- `src/main/cron/` — implementation
- `src/main/docs/modules/scheduling.paths.ts` — OpenAPI paths
- `src/main/scrapers/revolico/index.ts` — reference store registration
- `src/main/scrapers/CLAUDE.md` — scraper module patterns (section 8: store registration)
- `src/main/CLAUDE.md` — code patterns (Cron Module section)
- `swagger.json` — endpoint details (tag: `Admin - Scraping Schedules`)
- `.claude/skills/testing/SKILL.md` — Jest patterns (node-cron mock uses `require` style)
