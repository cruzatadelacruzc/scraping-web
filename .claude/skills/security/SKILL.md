---
name: security
description: 'Project-specific auth and security patterns: JWT (jsonwebtoken) with refresh tokens, AuthMiddleware + JWT blacklist + deletedAt guard, AsyncLocalStorage tenant context, ProviderTokenVerifier (jose ESM), password reset/verification flows, login rate limiting, account soft-delete. Use when implementing or reviewing authentication, authorization, or tenant isolation code in this Express + Inversify + Prisma project.'
applyTo: 'src/main/shared/security/**, src/main/shared/middleware/**, src/main/shared/tenant-context-als.ts, src/main/users/**'
risk: medium
---

# Security — Auth, JWT, Roles, Tenant Context

All examples are TypeScript with Inversify decorators (`@injectable()`, `@inject()`) and `inversify-express-utils` controllers. Do NOT introduce vanilla Express patterns.

## Middleware chain (order matters)

```
tenantInitMiddleware → AuthMiddleware → Controller → Service → Repository
```

`tenantInitMiddleware` must be FIRST — it initializes ALS. `AuthMiddleware` validates the JWT, checks the Redis blacklist (fail-open), rejects deactivated accounts (`User.deletedAt`), and attaches `req.user`. `AuthMiddleware.forRoles(...roles)` is a static factory that runs the full auth flow AND checks roles in a single pass.

**Usage in controllers:**

```typescript
@httpGet('/me', TYPES.AuthMiddleware)                              // auth only
@httpGet('/admin', AuthMiddleware.forRoles('ACCOUNT_OWNER'))        // auth + role
@httpGet('/shared', AuthMiddleware.forRoles('ACCOUNT_OWNER', 'MEMBER'))
```

`SUPER_ADMIN` automatically passes any `forRoles()` check — the role check is `roles.some(r => userRoles.includes(r))` and SUPER_ADMIN is always in the user's role list. Do NOT add manual `|| req.user.roles.includes('SUPER_ADMIN')` checks.

## TokenService & ITokenPayload

`src/main/shared/security/token.service.ts` wraps `jsonwebtoken`. The payload now includes:

```typescript
export interface ITokenPayload {
  userId: string;
  tenantId: string;
  roles?: string[];
  provider?: string;
  providerId?: string;
  jti?: string;  // UUID v4 — enables per-token blacklist on logout
  exp?: number;  // expiration timestamp (seconds since epoch)
}
```

**Never** hardcode `JWT_SECRET`. Throw at startup if missing.

## Refresh Tokens

`TokenManagementService` at `src/main/users/services/token-management.service.ts`:

- **Issue**: `crypto.randomBytes(48).toString('hex')` → SHA-256 hash stored in `RefreshToken` model, 30-day expiry. Each token belongs to a family (UUID v4).
- **Rotate**: on `POST /api/auth/refresh`, old token is marked `replacedBy` → new token id, new token issued in same family.
- **Theft detection**: if an already-replaced token is presented again, the **entire family is revoked** — this indicates token theft.
- **Revoke all**: called on password change and account deactivation.

## JWT Blacklist (logout)

Redis-based, keyed by `jti`. On logout, `AuthService.logout()` sets `jwt:blacklist:<jti>` with TTL = remaining token lifetime. `AuthMiddleware` checks this **after** JWT verification (fail-open: if Redis is down, requests are allowed through).

## Login Rate Limiting

`LoginRateLimitService` — same Redis fail-open pattern as `BotRateLimitService`:

| Limit | Threshold | Window | Lock |
|---|---|---|---|
| Per IP | 5 attempts | 15 min | 30 min |
| Per username | 10 attempts | 15 min | 30 min |

Checks run BEFORE password validation in `AuthService.login()`. Success resets counters. `LoginAttempt` model records every attempt.

## Account Soft-Delete

`AccountDeactivationService`: sets `User.deletedAt`, pauses all alarms (`enabled = false`), revokes refresh tokens, blacklists current JWT. 30-day reversible by `SUPER_ADMIN`. `AuthMiddleware` rejects any request where `found.deletedAt` is set.

> See @src/main/CLAUDE.md "Account Soft-Delete" section for the deactivation/purge flow details.

## ProviderTokenVerifier (Google, Facebook)

`src/main/shared/security/provider-token-verifier.ts` uses `jose` (ESM module). Validates ID tokens via JWKS.

**Testing gotcha**: `jose` is ESM-only and breaks Jest CJS. Tests MUST use the moduleNameMapper:

```typescript
// jest.config.js — specific overrides BEFORE generic path aliases:
'^jose$': '<rootDir>/src/__tests__/__mocks__/jose.ts',
'^@shared/security/provider-token-verifier$':
  '<rootDir>/src/main/shared/security/__mocks__/provider-token-verifier.ts',
```

> See @.claude/skills/testing/SKILL.md for complete Jest mock patterns.

## Email Service

`IEmailService` (Mock → dev, SmtpEmailService → prod), selected via `EMAIL_PROVIDER` env var. **Emails MUST go through the queue** — never call `IEmailService.send()` directly from a controller or service. Always enqueue `EMAIL_SEND_JOB` on `EmailQueues`.

> See @src/main/CLAUDE.md "Email Service" section for env vars and implementation details.

## Tenant Context & Isolation

ALS via `TenantContext` / `runWithRequestContext`. Prisma client extension auto-filters by `tenantId`. **Never** store tenant data in module-level scope — always read from ALS. MongoDB product data has NO tenant isolation.

> See AGENTS.md "Security & Multi-Tenancy" for the full setup.

## Common errors to avoid

- **Never** use globals for tenant context — always ALS.
- **Never** trust `req.user` without `AuthMiddleware` running first.
- **Never** hardcode `JWT_SECRET`. Throw at startup if missing.
- **Never** write `app.post(...)` — use `@controller` decorators and `AuthMiddleware.forRoles(...)`.
- **Never** send transactional emails synchronously — always enqueue via `EMAIL_SEND_JOB`.
- **Never** return different HTTP statuses for known vs unknown emails in forgot-password — always 200 to prevent enumeration.
- **Never** allow unlinking the last authentication method — check `user.passwordHash` and remaining `UserIdentity` records first.
- **Never** add manual `SUPER_ADMIN` role checks — `AuthMiddleware.forRoles()` already handles it.
