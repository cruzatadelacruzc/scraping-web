---
description: 'Project rules and architecture for the Price Monitoring SaaS: scraping, alarms, multi-tenant isolation, auth, and coding standards.'
applyTo: '**'
version: '1.3.0'
lastUpdated: '2026-06-05'
---

# Price Monitoring SaaS — Project Specification

A multi-tenant SaaS platform that lets customers create price-change alarms on products. The system periodically scrapes product data from target sites (e.g., Revolico), stores historical prices, evaluates alarm conditions, and notifies users when a price drops or rises. Built with TypeScript, Express, Inversify, BullMQ, Prisma, Mongoose, and Puppeteer.

## CRITICAL RULES - MUST FOLLOW

### PLANNING MODE

- Always ask clarifying questions
- Never assume design, tech stack or features
- Use deep-dive sub-agents to assist with research
- Use deep-dive sub-agents to review the different aspects of your planning to the user

### CHANGE / EDIT MODE

- Never implement features yourself when possible - use sub-agents!
- Identify changes from the plan that can be implemented in parallel, and use sub-agents to implement the features efficiently
- When using sub-agents to implement features, act as a coordinator only
- Use the best model for the task - premium models for complex tasks (like coding) and mid-tier models for simpler tasks, like documentation
- After completing features (large or small), always run commands like lint, type check and next build to check code quality

## Development Workflow

- Docker environment required: `docker-compose up -d` for dependencies
- Build: `npm run build`
- Dev mode: `npm run dev`
- Tests: `npm run test` (filter with `--testPathPattern="unit"` or `"integration"`)
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
- `DB_URI` — MongoDB connection string for scraped product data (Mongoose)
- `BULL_BOARD_USER` / `BULL_BOARD_PASSWORD` — credentials for the Queue Dashboard (`@bull-board`)

### Running Tests

```bash
npm run test                                         # Run all tests
npm run test -- --testPathPattern="unit"             # Unit tests only
npm run test -- --testPathPattern="integration"      # Integration tests only
npm run test -- --testPathPattern="auth.service|account.service"  # Specific files
npm run test:cov                                     # With coverage
```

Tests importing `@shared/security/provider-token-verifier` must mock it before import to avoid the ESM `jose` module issue. See `src/__tests__/unit/user.service.registerLocal.test.ts` for the pattern.

Integration tests use `MongoMemoryServer` (configured in `jest-mongodb-config.js`, started in `globalSetup.ts`). No external MongoDB instance is needed for tests.

## Architecture

**Layers**: Controller (request handling, Middleware, no business logic) → Service (business logic, orchestrates repositories, DTO with Zod validation ) → Repository (DB/queue interactions, tenant isolation via Prisma client extensions).

**DTOs**: Zod schemas with `z.infer<typeof>` for type inference. Static `from()` factory for parsing request bodies.

### Project Structure

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

**Database architecture**: The project uses **two databases**:
- **PostgreSQL** (Prisma) — users, accounts, alarms, subscriptions (`TENANT_DB_URL`)
- **MongoDB** (Mongoose) — scraped product data and price history (`DB_URI`)

**File naming**: `*.service.ts`, `*.controller.ts`, `*.repository.ts`, `*.interfaces.ts`. Group by feature/domain. Tests mirror source structure.

## Security & Multi-tenancy

### Middleware Chain

```
tenantInitMiddleware → AuthMiddleware → Controller
```

- **Tenant Context**: AsyncLocalStorage (ALS) stores tenant context — never use globals. All DB operations must include tenant scoping.
- **Auth**: JWT-based with integrated role validation via `AuthMiddleware.forRoles(...)` — auth + role check in a single pass.
- **SUPER_ADMIN** passes any `forRoles()` check automatically.

### Role System

| Rol | Propósito | Acceso |
|---|---|---|
| `SUPER_ADMIN` | Dueño del sistema / staff técnico | Todo: cuentas, planes, suscripciones, scraping manual, Queue Dashboard |
| `ACCOUNT_OWNER` | Cliente que paga la suscripción | Solo su tenant: crea alarmas, ve resultados, gestiona usuarios de su cuenta |
| `MEMBER` | Miembro del equipo (futuro) | Solo lectura dentro de su tenant (no implementado aún en guards) |

- `SUPER_ADMIN` — `forRoles()` always passes
- `ACCOUNT_OWNER` — scoped to tenant via ALS + Prisma extension
- `MEMBER` — seeded, not assigned to any endpoint yet

### Data Isolation

- Prisma client extensions for automatic tenant filtering
- No raw SQL unless using tenant-aware helpers
- Validate tenant ID matches in auth middleware

## External References

| Resource | Location |
|---|---|
| Code patterns (DI, queues, layers, testing) | `src/main/CLAUDE.md` |
| Alarm condition system (Strategy + Registry) | `src/main/alarms/CLAUDE.md` |
| Pre-merge compliance checklist | `.claude/rules/compliance-checklist.md` |
| TypeScript & JSDoc conventions | `.github/instructions/typescript-javadoc.instructions.md` |
| Environment setup | `.env.example` |
| PostgreSQL / Prisma schema | `prisma/schema.prisma` |
| MongoDB / Mongoose connection | `src/main/config/db-config.ts` |
| Queue port & adapters (BullMQ / Mock / SQS) | `src/main/shared/queue/` |
| Queue dashboard (`@bull-board`) | `src/main/shared/queue-dashboard/` |
| DB utility scripts | `scripts/` (RLS, migrations, Prisma generation) |
