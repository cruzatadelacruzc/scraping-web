---
name: security
description: 'Project-specific auth and security patterns: JWT (jsonwebtoken), AuthMiddleware + AuthMiddleware.forRoles, AsyncLocalStorage tenant context, ProviderTokenVerifier (jose ESM). Use when implementing or reviewing authentication, authorization, or tenant isolation code in this Express + Inversify + Prisma project.'
applyTo: 'src/main/shared/security/**, src/main/shared/middleware/**, src/main/shared/tenant-context-als.ts, src/main/users/**'
risk: medium
---

# Security — Auth, JWT, Roles, Tenant Context

All examples in this skill are TypeScript with Inversify decorators (`@injectable()`, `@inject()`) and `inversify-express-utils` controllers. Do NOT introduce vanilla Express examples (`app.post()`, `require()`) — they do not match this project.

## Middleware chain

Every protected request flows through this chain (in this exact order):

```
tenantInitMiddleware  →  AuthMiddleware  →  Controller  →  Service  →  Repository
```

- `tenantInitMiddleware` initializes AsyncLocalStorage (ALS) and sets `traceId`.
- `AuthMiddleware` validates the JWT, looks up the user, and attaches `req.user`.
- `AuthMiddleware.forRoles(...roles)` is a static factory that runs the full auth flow AND checks roles in a single pass.

If any layer is missing, downstream code cannot trust the tenant context. Always verify both middlewares are wired in `bootstrap.ts` (or wherever routes are registered).

## AuthMiddleware (real implementation)

`src/main/shared/middleware/auth.middleware.ts`:

```typescript
@injectable()
export class AuthMiddleware extends BaseMiddleware {
  public constructor(
    @inject(TYPES.Logger) private readonly _log: ILogger,
    @inject(TYPES.TokenService) private readonly _tokenService: TokenService,
  ) {
    super();
    this._log.context = AuthMiddleware.name;
  }

  public async handler(req: Request, res: Response, next: NextFunction): Promise<void> {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      ResponseHandler.unAuthenticated(res);
      return;
    }
    const token = authHeader.slice(7);
    const payload = await this._tokenService.verifyToken(token);
    const tenantId = payload?.tenantId ?? req.header('x-tenant-id');
    const userId = payload?.userId;
    if (!tenantId || !userId) {
      /* unAuthenticated */ return;
    }

    await runWithRequestContext({ tenantId, userId }, async () => {
      const found = await prisma.user.findFirst({
        where: {
          id: userId,
          accountId: tenantId, // <-- tenant scoping
          userIdentity:
            payload.provider && payload.provider !== 'local'
              ? { some: { provider: payload.provider, providerId: payload.providerId } }
              : undefined,
        },
        include: { userIdentity: true, roles: true },
      });
      if (!found) {
        /* unAuthorized */ return;
      }

      req.user = { ...payload, user: found, roles: found.roles.map(r => r.name) };
      next();
    });
  }

  public static forRoles(...roles: string[]) {
    return async (req, res, next) => {
      const { container } = require('../container'); // lazy require breaks circular dep
      const instance = container.get<AuthMiddleware>(TYPES.AuthMiddleware);
      await instance.handler(req, res, () => {
        const userRoles: string[] = (req.user as any)?.roles ?? [];
        if (!userRoles.length || !roles.some(r => userRoles.includes(r))) {
          ResponseHandler.unAuthorized(res);
          return;
        }
        next();
      });
    };
  }
}
```

### Usage in controllers

```typescript
import { controller, httpGet, httpPost } from 'inversify-express-utils';
import { AuthMiddleware } from '@shared/middleware/auth.middleware';

@controller('/users')
export class UserController {
  // auth only
  @httpGet('/me', TYPES.AuthMiddleware)
  public async getMe(req: Request, res: Response): Promise<void> {
    /* ... */
  }

  // auth + role check in a single pass
  @httpGet('/admin', AuthMiddleware.forRoles('ACCOUNT_OWNER'))
  public async admin(req: Request, res: Response): Promise<void> {
    /* ... */
  }

  // multiple roles
  @httpPost('/shared', AuthMiddleware.forRoles('ACCOUNT_OWNER', 'MEMBER'))
  public async shared(req: Request, res: Response): Promise<void> {
    /* ... */
  }
}
```

`SUPER_ADMIN` automatically passes any `forRoles()` check (the role check is `roles.some(r => userRoles.includes(r))` and SUPER_ADMIN is always seeded in the user's role list).

## TokenService

`src/main/shared/security/token.service.ts` — wraps `jsonwebtoken`:

```typescript
public generateToken(
  userId: string,
  accountId: string,
  roles?: string[],
  provider?: string,
  providerId?: string,
): string {
  const payload: ITokenPayload = { userId, tenantId: accountId, roles, provider, providerId };
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: process.env.JWT_EXPIRATION ?? '1d' });
}

public async verifyToken(token: string): Promise<ITokenPayload> {
  return jwt.verify(token, process.env.JWT_SECRET!) as ITokenPayload;
}

export interface ITokenPayload {
  userId: string;
  tenantId: string;
  roles?: string[];
  provider?: string;
  providerId?: string;
}
```

JWT secret MUST come from `process.env.JWT_SECRET` — never hardcoded. Throw if missing.

## TenantContext (AsyncLocalStorage)

`src/main/shared/tenant-context-als.ts`:

```typescript
export type RequestContext = { tenantId?: string; userId?: string; traceId?: string };
const asyncRequestContext = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(ctx: RequestContext, fn: () => T): T;
export function getRequestContext(): RequestContext | undefined;

@injectable()
export class TenantContext {
  public get tenantId(): string | undefined {
    return getRequestContext()?.tenantId;
  }
  public get userId(): string | undefined {
    return getRequestContext()?.userId;
  }
  public requireTenantId(): string {
    const id = this.tenantId;
    if (!id) throw new Error('Missing tenantId in request context');
    return id;
  }
}
```

Inject `TenantContext` into services that need tenant scoping. NEVER store tenant data in module-level scope — always read from ALS.

## Roles

| Role            | Pass `forRoles` | Scope                          | Endpoints                   |
| --------------- | --------------- | ------------------------------ | --------------------------- |
| `SUPER_ADMIN`   | always          | system-wide                    | all (`/admin/*`, dashboard) |
| `ACCOUNT_OWNER` | when seeded     | own tenant only                | tenant business endpoints   |
| `MEMBER`        | when seeded     | own tenant (read-only, future) | none yet                    |

The role check happens via Prisma lookup inside `AuthMiddleware` — there is no separate role guard.

## ProviderTokenVerifier (Google, Facebook)

`src/main/shared/security/provider-token-verifier.ts` uses `jose` (ESM module). It validates Google/Facebook ID tokens via JWKS in production or tokeninfo endpoint in dev.

```typescript
import { jwtVerify, createRemoteJWKSet } from 'jose';

const jwks = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const { payload } = await jwtVerify(idToken, jwks, { issuer: 'https://accounts.google.com' });
```

**Testing**: `jose` is an ESM module and breaks Jest CJS. Tests MUST mock it via the moduleNameMapper (see @../testing/SKILL.md):

```typescript
// jest.config.js
moduleNameMapper: {
  '^jose$': '<rootDir>/src/__tests__/__mocks__/jose.ts',
  '^@shared/security/provider-token-verifier$':
    '<rootDir>/src/main/shared/security/__mocks__/provider-token-verifier.ts',
}
```

## Tenant isolation (Prisma)

The Prisma client is wrapped in an extension that automatically filters by `tenantId` from ALS. This means service code can write:

```typescript
const alarms = await prisma.alarm.findMany(); // auto-filtered by tenantId
const user = await prisma.user.findUnique({ where: { id } }); // auto-scoped
```

without manually passing `where: { accountId: tenantId }`. For MongoDB features, tenant isolation does NOT apply — product data is shared across tenants.

## Common errors to avoid

- **Never** use globals for tenant context — always ALS.
- **Never** trust `req.user` without `AuthMiddleware` running first.
- **Never** include `tenantId` in user-facing error messages or logs that leak outside the system.
- **Never** hardcode `JWT_SECRET`. Throw at startup if missing.
- **Never** write `app.post(...)` or use Express bare functions — this project uses `@controller` decorators and `AuthMiddleware.forRoles(...)`.
- **Never** call `jwt.verify` with the secret as a string literal — load from env.
