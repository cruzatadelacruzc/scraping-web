---
description: 'Project rules and architecture for the Price Monitoring SaaS: scraping, alarms, multi-tenant isolation, auth, and coding standards.'
applyTo: '**'
version: '1.1.0'
lastUpdated: '2026-06-03'
---

# Price Monitoring SaaS — Project Specification

A multi-tenant SaaS platform that lets customers create price-change alarms on products. The system periodically scrapes product data from target sites (e.g., Revolico), stores historical prices, evaluates alarm conditions, and notifies users when a price drops or rises. Built with TypeScript, Express, Inversify, BullMQ, Prisma, and Puppeteer.

## Quick Navigation

- [How to Use This File](#how-to-use-this-file)
- [Core System Architecture](#core-system-architecture)
- [Development Workflow](#development-workflow)
- [Architecture & Responsibilities](#architecture--responsibilities)
- [Security & Multi-tenancy](#security--multi-tenancy)
- [Development Standards](#development-standards)
- [Specialized Agents](#specialized-agents)
- [Compliance Checklist](#compliance-checklist)

## How to Use This File

This is the **base specification** for all development in this project:

### For General Development

- Follow all sections as the foundation for your work
- Use this when building features, fixing bugs, or refactoring
- Reference examples and patterns for consistency

### For Creating Specialized Agents

- Read the [Specialized Agents](#specialized-agents) section
- Create a `.agent.md` file that inherits these conventions
- Restrict scope to your domain while following architecture rules
- Example: `.scraper-builder.agent.md`

### For Code Review

- Use the [Compliance Checklist](#compliance-checklist) to validate pull requests
- Ensure all changes align with TypeScript, multi-tenant, and logging standards

---

# Core System Architecture

## Development Workflow

- Docker environment required: `docker-compose up -d` for dependencies
- Build: `npm run build`
- Dev mode: `npm run dev`
- Tests: `npm run test:unit` / `npm run test:integration`
- Migrations: `npm run migrate:dev`
- Seed: `npm run seed`
- Lint: `npm run lint`

### Available Commands

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with hot-reload (`ts-node-dev`) |
| `npm run build` | Clean + compile TypeScript + resolve path aliases |
| `npm run start` | Start production server from `dist/` |
| `npm run test` | Run all tests (`jest --verbose`) |
| `npm run test -- --testPathPattern="unit"` | Run unit tests only |
| `npm run test -- --testPathPattern="integration"` | Run integration tests only |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:cov` | Run tests with coverage report |
| `npm run migrate:dev` | Run Prisma migrations in dev |
| `npm run seed` | Seed database with default roles + SUPER_ADMIN user |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Run ESLint with auto-fix |
| `npm run format` | Run Prettier formatting |
| `npm run clean` | Remove `dist/` directory |

### Environment Variables

Copy `.env.example` to `.env` and fill in values. Required variables:

- `JWT_SECRET` — secret key for JWT signing
- `JWT_EXPIRATION` — token expiration (e.g. `1d`, `7d`)
- `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` — initial super-admin credentials (used by seed)
- `TENANT_DB_URL` — PostgreSQL connection string for Prisma
- `REDIS_URL` — Redis connection for BullMQ queues
- `BULL_BOARD_USER` / `BULL_BOARD_PASSWORD` — credentials for Bull Arena dashboard

### Running Tests

```bash
# Run all tests
npm run test

# Run only unit tests
npm run test -- --testPathPattern="unit"

# Run specific test files
npm run test -- --testPathPattern="auth.service|account.service"

# Run with coverage
npm run test:cov
```

Note: Tests that import `@shared/security/provider-token-verifier` must mock it before import to avoid the ESM `jose` module issue. See `src/__tests__/unit/user.service.registerLocal.test.ts` for the pattern.

## Required Environment Setup

- `BULL_BOARD_USER`/`BULL_BOARD_PASSWORD` for queue dashboard auth
- Database connection strings (check `.env.example`)
- Bull Arena dashboard at `CONFIG.bull_arena_url`

## Architecture & Responsibilities

### 1. Controller Layer

- Use `inversify-express-utils` decorators (`@controller`, `@httpGet`, etc.)
- Validate requests using Zod DTOs
- No business logic - only request handling and response shaping
- Example structure:

```typescript
@controller('/api/revolicos/scraping')
export class ScrapingController {
  constructor(
    @inject(TYPES.Logger) private readonly _log: ILogger,
    @inject(TYPES.ScrapingManyProduct) private scrapingJob: ScrapingProductsService,
  ) {
    this._log.context = ScrapingController.name;
  }

  @httpPost('/jobs', ValidateRequestMiddleware.with(ScrapingProductsDTO))
  public async addNewJob(req: Request, res: Response): Promise<void> {
    const request = ScrapingProductsDTO.from(req.body);
    const jobId = await this.scrapingJob.addScrapingJob(request);
    ResponseHandler.created(res, 'http:created', { jobId });
  }
}
```

### 2. Service Layer

- Implements core business logic and orchestration
- Must inject ILogger and necessary repositories/adapters
- Operates on domain models and typed DTOs
- Handles queue job publishing via repository layer
- Example pattern:

```typescript
@injectable()
export class ScrapingProductsService {
  constructor(
    @inject(TYPES.Logger) private _log: ILogger,
    @inject(TYPES.ProductService) private productService: ProductService,
    @inject(TYPES.RevolicoData) private fetchService: IFetchProductData,
  ) {
    this._log.context = ScrapingProductsService.name;
  }
}
```

### 3. Repository/Adapter Layer

- Handles all external interactions (DB, queues)
- Enforces tenant isolation via Prisma client extensions
- Queue operations use BullMQ/Arena
- Example repository pattern:

```typescript
@injectable()
export class ProductRepository {
  constructor(
    @inject(TYPES.PrismaClient) private prisma: PrismaClient,
    @inject(TYPES.TenantContext) private tenantCtx: TenantContext,
  ) {}

  async findById(id: string) {
    return this.prisma.product.findUnique({
      where: {
        id,
        accountId: this.tenantCtx.tenantId,
      },
    });
  }
}
```

### 4. Data Transfer Objects

- Use Zod for validation
- Include type definitions and validation schemas
- Example pattern:

```typescript
export const ScrapingProductsDTO = z.object({
  url: z.string().url(),
  category: z.string(),
});

export type ScrapingProductsType = z.infer<typeof ScrapingProductsDTO>;
```

## Queue System Architecture

1. Queue Registration:

```typescript
@injectable()
export class RevolicoQueues implements IQueueModule {
  readonly queues = [QUEUE_NAME.products_scraping, QUEUE_NAME.product_storage, QUEUE_NAME.product_scraping];
}
```

2. Job Processing:

```typescript
async process(job: Job<T>): Promise<void> {
  try {
    await this.fetchService.fetchProductDetails(job.data.url, job);
    job.progress(100);
  } catch (error) {
    this._log.error('Job processing failed', { jobId: job.id, error });
    throw error;
  }
}
```

## Alarm Condition System

Alarm conditions use a **Strategy + Registry** pattern so that adding a new condition requires zero changes to the engine. Each condition is a standalone class — the engine just looks up the condition type in the registry and delegates.

### Architecture

```
conditions/
├── condition.interface.ts       # IAlarmCondition + ProductSnapshot
├── condition-registry.ts        # Map<AlarmConditionType, IAlarmCondition>
├── price-drops-below.condition.ts
├── price-rises-above.condition.ts
├── price-changes-by-percent.condition.ts
├── views-exceed.condition.ts
├── is-outstanding.condition.ts
└── seller-changed.condition.ts
```

### Key Contracts

- **`IAlarmCondition`** — strategy interface with `evaluate()`, `buildNotification()`, and optional `computeParamsUpdate()`.
- **`ProductSnapshot`** — full product data passed from the scraping pipeline (url, price, views, isOutstanding, seller, location, priceHistory). Each condition reads the fields it needs.
- **`ConditionRegistry`** — injected singleton. `registry.get(type)` returns the strategy. The engine calls it dynamically — no `switch/case`.
- **`Alarm.params`** — JSON column for condition-specific state. Conditions implement `computeParamsUpdate()` to persist snapshots (e.g., `SELLER_CHANGED` stores the seller fingerprint).

### Flow

```
ProductService.setupQueueListeners()
  → alarmEngine.evaluateAlarms(ProductSnapshot[])
    → registry.get(alarm.condition).evaluate(product, alarm)
    → if match: AlarmHistory + Notification
    → registry.get(alarm.condition).computeParamsUpdate?() → alarm.params
```

### Adding a New Condition

See the `alarm-condition` skill for the step-by-step recipe. In short:

1. Add value to `AlarmConditionType` Prisma enum → `prisma db push`
2. Create `src/main/alarms/conditions/<name>.condition.ts` implementing `IAlarmCondition`
3. Add Symbol in `types.container.ts`
4. Register in `ConditionRegistry` constructor + bind in `container.ts`
5. Verify: `npx tsc --noEmit` + `npm run test`

The engine is never touched — it resolves the new condition by its type key automatically.

## Security & Multi-tenancy

1. Tenant Context:

- Every request must pass through `tenantInitMiddleware`
- Use AsyncLocalStorage (ALS) to store tenant context
- All DB operations must include tenant scoping

2. Authentication & Authorization:

- JWT-based auth with integrated role validation via `AuthMiddleware`
- Middleware chain: `tenantInitMiddleware` → `AuthMiddleware` → `Controller`
- `AuthMiddleware.forRoles(...)` guards endpoints — auth + role check in a single pass
- `SUPER_ADMIN` has universal access: passes any `forRoles()` check automatically

3. Role System:

| Rol | Propósito | Acceso claves |
|---|---|---|
| `SUPER_ADMIN` | Dueño del sistema / staff técnico | Todo: cuentas, planes, suscripciones, scraping manual, Bull Arena |
| `ACCOUNT_OWNER` | Cliente que paga la suscripción | Solo su tenant: crea alarmas, ve resultados, gestiona usuarios de su cuenta |
| `MEMBER` | Miembro del equipo del owner (futuro) | Solo lectura dentro de su tenant (no implementado aún en guards) |

Role hierarchy:
- `SUPER_ADMIN` is omnipotent — `forRoles()` always passes for them (see `auth.middleware.ts:hasRole`)
- `ACCOUNT_OWNER` is scoped to their tenant via ALS + Prisma extension
- `MEMBER` is seeded but not assigned to any endpoint yet — reserved for future team feature

4. Data Isolation:

- Use Prisma client extensions for automatic tenant filtering
- No raw SQL unless using tenant-aware helpers
- Validate tenant ID matches in auth middleware

## Development Standards

1. Logging:

```typescript
constructor(@inject(TYPES.Logger) private _log: ILogger) {
  this._log.context = ClassName;
}

this._log.debug('Operation details', {
  tenantId: this.tenantCtx.tenantId,
  requestId: req.id,
  ...details
});
```

2. Error Handling:

- Use domain-specific error classes
- Consistent error responses via `ResponseHandler`
- Log errors with proper context

3. Testing:

- Unit tests: Mock tenant context and external dependencies
- Integration tests: Use `runWithRequestContext`
- Test tenant isolation explicitly

## Project Structure

```
src/
├── main/           # Application code
│   ├── app.ts      # App bootstrap
│   ├── config/     # Configuration
│   ├── scrapers/   # Scraping modules
│   ├── shared/     # Common utilities
│   └── users/      # User management
└── __tests__/      # Test files
```

## File Organization Rules

- Group by feature/domain (users, scrapers, etc.)
- Use barrel files (index.ts) for clean exports
- Tests mirror source structure
- Consistent file naming:
  - `*.service.ts`
  - `*.controller.ts`
  - `*.repository.ts`

## Creating New Components

1. Add Symbol to `types.container.ts`
2. Create interfaces/types
3. Implement class with proper decorators
4. Register in container
5. Add unit and integration tests

## Debugging & Monitoring

- Bull Arena dashboard for queue monitoring
- Structured logging with request/tenant context
- OpenAPI/Swagger docs at `/api-docs`

---

## Specialized Agents

While this document establishes global rules, **specialized agents** can focus on specific domains with restricted scope and tools.

### When to Create a Specialized Agent

✅ Create a specialized agent if you need to:

- Focus on a specific domain (scrapers, auth, database)
- Restrict terminal execution or other tools
- Implement consistent patterns for a subsystem
- Onboard domain experts who need guardrails

❌ Use the general AGENTS.md if:

- The task spans multiple domains
- You need full tool access
- You're exploring or debugging across systems

### Creating a Specialized Agent

1. **File naming**: `.{domain}-{role}.agent.md` (e.g., `.scraper-builder.agent.md`)
2. **Frontmatter**:
   ```yaml
   ---
   description: 'Brief purpose'
   applyTo: 'src/main/{domain}/**'
   ---
   ```
3. **Structure**:

   - Purpose & When to Use
   - Scope & Constraints (domain focus)
   - Tools & Approach (allowed/restricted)
   - Architecture Rules (inherit from AGENTS.md)
   - Example Workflow
   - Related Resources

4. **Inherit, Don't Repeat**:
   - Reference AGENTS.md sections
   - Only override what's necessary
   - Keep specialized agents DRY (Don't Repeat Yourself)

### Example: Scraper Builder Agent

See `.scraper-builder.agent.md` for a reference implementation:

- Focuses on `src/main/scrapers/revolico/`
- Restricts terminal execution
- Emphasizes parser patterns and testing
- Inherits all architecture rules from AGENTS.md

---

## Compliance Checklist

Before completing any task, verify these requirements:

### Code Standards ✓

- [ ] **TypeScript**: Strict mode, no `any` types, proper generics
- [ ] **JSDoc**: All functions documented with `@param`, `@returns`, `@example` where helpful
- [ ] **File Naming**: Matches conventions (`*.service.ts`, `*.controller.ts`, `*.repository.ts`)
- [ ] **Imports**: Organized (types → interfaces → implementations) using barrel files

### Architecture & Patterns ✓

- [ ] **Inversify**: Classes use `@injectable()` and `@inject()` decorators
- [ ] **Dependency Injection**: All external dependencies injected, no direct instantiation
- [ ] **Layers**: Proper separation (Controller → Service → Repository)
- [ ] **DTOs**: Zod schemas with type inference (`z.infer<typeof>`)

### Multi-Tenancy & Security ✓

- [ ] **Tenant Context**: Request passes `tenantInitMiddleware`
- [ ] **Data Isolation**: All DB queries filter by `accountId` or tenant
- [ ] **No Tenant Leakage**: Module scope doesn't store tenant-specific data
- [ ] **AsyncLocalStorage**: Used for tenant context (ALS), not globals

### Logging & Monitoring ✓

- [ ] **Context**: Logger has `this._log.context = ClassName`
- [ ] **Request Context**: Logs include `tenantId`, `requestId`, operation details
- [ ] **Error Handling**: Errors logged with context before throwing/responding
- [ ] **Progress Tracking**: Long-running operations report `job.progress()`

### Testing ✓

- [ ] **Unit Tests**: Mirror source structure in `src/__tests__/unit/`
- [ ] **Mocking**: Dependencies mocked, tenant context isolated
- [ ] **Edge Cases**: Tests include empty, malformed, boundary conditions
- [ ] **Integration Tests**: Use `runWithRequestContext` for tenant isolation

### Queue & Background Jobs ✓

- [ ] **Job Handlers**: Implement `process(job: Job<T>): Promise<void>`
- [ ] **Error Handling**: Errors logged, job retries configured
- [ ] **Progress**: Job reports progress via `job.progress(percentage)`
- [ ] **Registration**: Queues registered in `IQueueModule` implementation

### Documentation ✓

- [ ] **README**: Updated if adding new features or modules
- [ ] **Examples**: Complex patterns have JSDoc examples
- [ ] **Type Clarity**: Generic types named clearly (not `T`, use `TData`, `TResponse`)
- [ ] **API Docs**: Swagger/OpenAPI updated for new endpoints

---

## External References

- **TypeScript & JSDoc Conventions**: [.github/instructions/typescript-javadoc.instructions.md](.github/instructions/typescript-javadoc.instructions.md)
- **Environment Setup**: See `.env.example`
- **Database**: `prisma/schema.prisma`
- **Queue Config**: `src/main/config/queue.config.ts`
