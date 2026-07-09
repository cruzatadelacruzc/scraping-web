---
description: 'Project rules and architecture for BazaarSentinel — multi-tenant SaaS for marketplace listing monitoring: scraping, alarms, multi-tenant isolation, auth, and coding standards.'
applyTo: '**'
---

# BazaarSentinel — Project Specification

A multi-tenant SaaS platform that watches product listings across online bazaars (e.g., Revolico) for any user-configurable change — price drops or rises, view-count thresholds, seller changes, outstanding status — and notifies tenants when their alarm conditions match. Built with TypeScript, Express, Inversify, BullMQ, Prisma, Mongoose, and Puppeteer.

## Stack

- **Language**: TypeScript (strict mode, target ES2022)
- **Server**: Express with `inversify-express-utils` controllers and decorators
- **DI**: Inversify (`@injectable()`, `@inject(TYPES.X)`)
- **Queues**: BullMQ with `@bull-board` dashboard, swappable via `QUEUE_BACKEND` (`bullmq` | `sqs` | `mock`)
- **Databases**: PostgreSQL (Prisma) for tenants/accounts/alarms; MongoDB (Mongoose) for scraped product data
- **Scraping**: Puppeteer with local Chrome/Chromium
- **Auth**: JWT (`jsonwebtoken`) + provider tokens (`jose`)

> See rule: @.claude/rules/folder-structure.md for the canonical module layout. Follow strictly.

## Development Workflow

| Command                             | Description                                |
| ----------------------------------- | ------------------------------------------ |
| `docker-compose up -d`              | Start MongoDB, Redis, Postgres             |
| `npm run dev`                       | Dev server with hot-reload (`ts-node-dev`) |
| `npm run build`                     | Clean + compile TypeScript + path aliases  |
| `npm run start`                     | Run compiled `dist/`                       |
| `npm run test`                      | All tests (Jest)                           |
| `npm run test -- --testPathPattern` | Filter tests by path                       |
| `npm run test:cov`                  | Tests with coverage                        |
| `npm run test:watch`                | Watch mode                                 |
| `npm run migrate:dev`               | Prisma migrations                          |
| `npm run seed`                      | Seed default roles + SUPER_ADMIN user      |
| `npm run lint`                      | ESLint                                     |
| `npm run lint:fix`                  | ESLint with auto-fix                       |
| `npm run format`                    | Prettier                                   |
| `npm run docs:generate`             | Regenerate `swagger.json` from Zod DTOs    |
| `npm run docs:validate`             | CI: diff swagger.json vs generated         |
| `npm run clean`                     | Remove `dist/`                             |

### Environment variables

Copy `.env.example` to `.env`. Required variables:

- `JWT_SECRET` — JWT signing secret
- `JWT_EXPIRATION` — token expiration (e.g. `1d`)
- `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` — used by `npm run seed`
- `TENANT_DB_URL` — PostgreSQL connection string for Prisma
- `REDIS_URL` — Redis for BullMQ
- `DB_URI` — MongoDB for scraped product data
- `BULL_BOARD_USER` / `BULL_BOARD_PASSWORD` — dashboard basic auth

> See skill: @.claude/skills/docker-dev/SKILL.md for the full list of env vars and the docker-compose workflow. Follow strictly.

## Architecture

**Layers**: Controller (request handling, validation, response shaping) → Service (business logic, orchestration) → Repository (DB / queue access, tenant isolation via Prisma extensions).

> See file: @src/main/CLAUDE.md for layer responsibilities and code patterns (DI, DTOs, mappers, queue system, coding constraints, TDD workflow). Follow strictly.

**Folder structure**: every module under `src/main/<module>/` follows the canonical layout (controllers, services/dto, repositories, errors, mappers, optional models/utils, optional module-specific folders).

> See rule: @.claude/rules/folder-structure.md for the canonical module layout. Follow strictly.

### File naming (canonical suffixes)

> See rule: @.claude/rules/compliance-checklist.md for the canonical File naming. Follow strictly.

### Project structure

```
src/
├── main/              # Application code
│   ├── app.ts         # App bootstrap
│   ├── bootstrap.ts   # Entry point
│   ├── admin/         # Super-admin panel
│   ├── alarms/        # Alarm engine, conditions, notifications
│   ├── config/        # Configuration (DB, queues, constants)
│   ├── scrapers/      # Scraping modules (e.g., revolico/)
│   ├── shared/        # DI container, middleware, security, logger
│   ├── types/         # Express type augmentation
│   ├── users/         # Accounts, auth, plans, subscriptions
│   └── utils/         # Shared helpers (puppeteer, normalization)
└── __tests__/         # Test files (unit/ + integration/)
```

### Databases

- **PostgreSQL** (Prisma) — users, accounts, alarms, subscriptions (`TENANT_DB_URL`)
- **MongoDB** (Mongoose) — scraped product data and price history (`DB_URI`)

## Security & Multi-Tenancy

### Middleware chain

```
tenantInitMiddleware → AuthMiddleware → Controller
```

> See skill: @.claude/skills/security/SKILL.md for `AuthMiddleware`, `AuthMiddleware.forRoles`, `TokenService`, `TenantContext` (AsyncLocalStorage), and `ProviderTokenVerifier`. Follow strictly.

### Tenant context (AsyncLocalStorage)

ALS stores tenant context — never use globals. All DB operations must include tenant scoping.

> See skill: @.claude/skills/security/SKILL.md for ALS details (`runWithRequestContext`, `getRequestContext`, `TenantContext.requireTenantId`). Follow strictly.

### Auth

JWT-based with integrated role validation via `AuthMiddleware.forRoles(...)` — auth + role check in a single pass. `SUPER_ADMIN` automatically passes any `forRoles()` check.

Includes refresh tokens (opaque, SHA-256 hashed, 30-day rotation with theft detection), password reset (bcrypt-hashed single-use tokens, 1h expiry), email verification (24h tokens, auto-sent on registration), OAuth provider linking/unlinking, and JWT blacklist via Redis (using `jti` claim, fail-open if Redis down).

Login is rate-limited per IP (5 attempts/15min) and per username (10 attempts/15min) with a 30-min lock after exceeding. `AuthMiddleware` also rejects deactivated accounts (`User.deletedAt`).

`AccountDeactivationService` handles soft-delete: sets `deletedAt`, pauses all alarms (`enabled = false`), revokes refresh tokens, blacklists the current JWT. Reversible within 30 days by SUPER_ADMIN.

> See skill: @.claude/skills/security/SKILL.md for JWT verification, provider tokens (Google/Facebook via `jose`), refresh tokens, JWT blacklist, rate limiting, and common errors to avoid. Follow strictly.

### Role system

| Role            | Purpose                        | Access                                                                       |
| --------------- | ------------------------------ | ---------------------------------------------------------------------------- |
| `SUPER_ADMIN`   | System owner / technical staff | Everything: accounts, plans, subscriptions, manual scraping, Queue Dashboard |
| `ACCOUNT_OWNER` | Paying customer                | Own tenant only: create alarms, view results, manage users on the account    |
| `MEMBER`        | Team member (future)           | Read-only inside own tenant (no endpoints assigned yet)                      |

### Data isolation

- Prisma client extensions for automatic tenant filtering
- No raw SQL unless using tenant-aware helpers
- Validate tenant ID matches in auth middleware
- MongoDB product data is shared across tenants — no isolation applies

## Testing

Unit tests mirror source structure under `src/__tests__/unit/`. Integration tests under `src/__tests__/integration/`. ESM `jose` module is mocked via `moduleNameMapper`. Tenant context is wrapped in `runWithRequestContext(...)` for integration tests.

> See skill: @.claude/skills/testing/SKILL.md for Jest patterns, `MongoMemoryServer`, Prisma mocks, ALS mocking, and TDD workflow. Follow strictly.

## API Documentation

After developing and passing tests, ALWAYS run `npm run docs:generate`. This regenerates `swagger.json` from Zod DTOs and path definitions in `src/main/docs/`. Run after any change to DTOs, controllers, or new endpoints.

> See file: @src/main/CLAUDE.md "API Documentation" section for tool, architecture, special schemas, and path aliases. Follow strictly.

## Quality Gates

Run before `git commit` — see @.claude/rules/compliance-checklist.md for the full checklist.

## External References

| Resource                                    | Location                                            |
| ------------------------------------------- | --------------------------------------------------- |
| Folder structure (canonical layout)         | `.claude/rules/folder-structure.md`                 |
| Code patterns (DI, queues, layers, TDD)     | `src/main/CLAUDE.md`                                |
| Meta-workflow rules (planning/change mode)  | `.claude/rules/meta-workflow.md`                    |
| Pre-merge compliance checklist              | `.claude/rules/compliance-checklist.md`             |
| Auth, JWT, roles, tenant context            | `.claude/skills/security/SKILL.md`                  |
| Docker dev environment                      | `.claude/skills/docker-dev/SKILL.md`                |
| Testing patterns (Jest + ALS + mocks)       | `.claude/skills/testing/SKILL.md`                   |
| Add a new alarm condition                   | `.claude/skills/alarm-condition/SKILL.md`           |
| Bot module (WhatsApp + Telegram)            | `.claude/skills/bots/SKILL.md`                      |
| TypeScript best practices                   | `.claude/skills/typescript-best-practices/SKILL.md` |
| Cron scraping scheduler                     | `.claude/skills/cron-scheduler/SKILL.md`            |
| PostgreSQL / Prisma schema                  | `prisma/schema.prisma`                              |
| MongoDB / Mongoose connection               | `src/main/config/db-config.ts`                      |
| Queue port & adapters (BullMQ / Mock / SQS) | `src/main/shared/queue/`                            |
| Queue dashboard (`@bull-board`)             | `src/main/shared/queue-dashboard/`                  |
| DB utility scripts                          | `scripts/`                                          |
| Environment setup                           | `.env.example`                                      |
| Super Admin SPA module guide                | `apps/admin-web/CLAUDE.md`                          |
| Account management (passwords, tokens, deactivation, email) | `src/main/users/` (account-management.controller, services/email/) |
