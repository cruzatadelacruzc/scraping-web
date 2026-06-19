---
name: typescript-best-practices
description: Use when reading or writing TypeScript or JavaScript files (.ts, .tsx, .js, tsconfig.json). All examples are drawn from the BazaarSentinel project — branded types, Zod DTOs, discriminated unions, exhaustive switches.
---

# TypeScript Best Practices (project-style)

Type-first, functional-leaning, error-aware patterns. Every example below is taken from this codebase (`src/main/users/dto/user-register.dto.ts`, `src/main/alarms/conditions/condition.interface.ts`, `prisma/schema.prisma`).

## Make Illegal States Unrepresentable

Use the type system to prevent invalid states at compile time.

**Discriminated unions for mutually exclusive states** — taken from `IAlarmCondition.computeParamsUpdate`:

```ts
// Good: only valid combinations possible — the optional method is on its own
// variant of the union, so callers must handle the absence.
export interface IAlarmCondition {
  readonly type: string;
  evaluate(product: IProductSnapshot, alarm: Alarm): boolean;
  buildNotification(alarm: Alarm, product: IProductSnapshot): [string, string];
  computeParamsUpdate?(
    currentParams: Record<string, unknown>,
    product: IProductSnapshot,
  ): Record<string, unknown> | null;
}

// Bad: caller can't tell whether `computeParamsUpdate` is missing because
// the condition is stateless vs. forgotten to be implemented.
type AlarmCondition = {
  type: string;
  evaluate: (...) => boolean;
  buildNotification: (...) => [string, string];
  computeParamsUpdate?: (...) => Record<string, unknown> | null;
};
```

**Const assertions for literal unions** — keep arrays and TS types in sync:

```ts
// src/main/alarms/conditions/condition.interface.ts would benefit from:
const CONDITION_TYPES = [
  'PRICE_DROPS_BELOW',
  'PRICE_RISES_ABOVE',
  'PRICE_CHANGES_BY_PERCENT',
  'VIEWS_EXCEED',
  'IS_OUTSTANDING',
  'SELLER_CHANGED',
] as const;
type AlarmConditionTypeValue = typeof CONDITION_TYPES[number];
```

The Prisma `enum AlarmConditionType { ... }` is the source of truth for the DB; mirror it in TS via `typeof` rather than re-typing by hand.

**Exhaustive switch with `never` check** — for alarm conditions:

```ts
import { AlarmConditionType } from '@prisma/client';

function conditionLabel(type: AlarmConditionType): string {
  switch (type) {
    case 'PRICE_DROPS_BELOW':        return 'drops below threshold';
    case 'PRICE_RISES_ABOVE':        return 'rises above threshold';
    case 'PRICE_CHANGES_BY_PERCENT': return 'changes by percentage';
    case 'VIEWS_EXCEED':             return 'exceeds view count';
    case 'IS_OUTSTANDING':           return 'marked outstanding';
    case 'SELLER_CHANGED':           return 'seller changed';
    default: {
      const _exhaustive: never = type;
      throw new Error(`Unhandled condition type: ${_exhaustive}`);
    }
  }
}
```

## Runtime Validation with Zod — project DTO pattern

The project uses Zod schemas + a `from()` factory on a DTO class. Source of truth: `src/main/users/dto/user-register.dto.ts`.

```ts
import { z } from 'zod';
import { ValidationError } from '@shared/errors/validation.error';

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'must contain uppercase')
  .regex(/[a-z]/, 'must contain lowercase')
  .regex(/[0-9]/, 'must contain a number');

const usernameSchema = z.string()
  .min(3).max(30)
  .transform(v => v.toLowerCase())
  .refine(v => /^[a-z0-9_-]+$/.test(v), 'invalid characters');

export const UserRegisterSchema = z.object({
  accountId: z.string().uuid(),
  email:     z.string().email().transform(v => v.toLowerCase()),
  username:  usernameSchema,
  password:  passwordSchema,
  roleIds:   z.array(z.string().uuid()).optional(),
  displayName: z.string().optional(),
  avatarUrl:   z.string().url().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type UserRegisterType = z.infer<typeof UserRegisterSchema>;

export class UserRegisterDTO {
  public constructor(
    public readonly email: string,
    public readonly username: string,
    public readonly password: string,
    public readonly accountId?: string,
    public readonly roleIds?: string[],
    public readonly displayName?: string,
    public readonly avatarUrl?: string,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {}

  /** Strict parse at the trust boundary — throws ValidationError on failure. */
  public static from(data: Partial<UserRegisterType>): UserRegisterDTO {
    try {
      const parsed = UserRegisterSchema.parse(data);
      return new UserRegisterDTO(
        parsed.email, parsed.username, parsed.password,
        parsed.accountId, parsed.roleIds, parsed.displayName,
        parsed.avatarUrl, parsed.createdAt, parsed.updatedAt,
      );
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw new ValidationError(err.issues.map(({ code, message, path }) => ({ code, message, path })));
      }
      throw err;
    }
  }
}
```

### Conventions observed in this codebase

- Schema file is `*.dto.ts` colocated with the DTO class.
- `z.infer<typeof Schema>` derives the TS type — never duplicate it manually.
- `from(data)` is `static`, calls `schema.parse(...)` (strict) at the trust boundary — controllers can call `UserRegisterDTO.from(req.body)` and rely on validation throwing `ValidationError` (mapped to HTTP 400 by `ResponseHandler`).
- `safeParse` is reserved for cases where failure is expected and the caller wants to inspect errors — never at controller boundaries.

### Composition

```ts
// Sub-DTO reused by create + update
export const AlarmThresholdSchema = z.object({
  threshold: z.number().positive().optional(),
  percentage: z.number().min(-100).max(1000).optional(),
});
export type AlarmThreshold = z.infer<typeof AlarmThresholdSchema>;

export const CreateAlarmSchema = z.object({
  name: z.string().min(1).max(120),
  conditionType: z.enum([
    'PRICE_DROPS_BELOW', 'PRICE_RISES_ABOVE', 'PRICE_CHANGES_BY_PERCENT',
    'VIEWS_EXCEED', 'IS_OUTSTANDING', 'SELLER_CHANGED',
  ]),
  productUrl: z.string().url(),
}).merge(AlarmThresholdSchema);   // reuses threshold + percentage

export const UpdateAlarmSchema = CreateAlarmSchema.partial();
```

## Optional: type-fest

For advanced type utilities beyond TS builtins:

- `Opaque<T, Token>` — cleaner branded types than `string & { __brand }`
- `PartialDeep<T>` — recursive partial for nested objects
- `ReadonlyDeep<T>` — recursive readonly for immutable data
- `SetRequired<T, K>` / `SetOptional<T, K>` — targeted field modifications
- `Simplify<T>` — flatten complex intersection types in IDE tooltips

```ts
import type { Opaque, PartialDeep } from 'type-fest';

type UserId   = Opaque<string, 'UserId'>;
type AlarmId  = Opaque<string, 'AlarmId'>;
type AlarmPatch = PartialDeep<Alarm>;
```

## Pair with React Best Practices

When working with React components (`.tsx`, `.jsx`, `@react` imports), always load `react-best-practices` alongside this skill. This skill covers TypeScript fundamentals; React-specific patterns (effects, hooks, refs, component design) are in the dedicated React skill.

## Anti-patterns in this codebase to avoid

- `any` on `req.user` (see `auth.middleware.ts:16`) — historical, don't propagate. New code uses `ITokenPayload` from `@shared/security/token.service`.
- Bare `T` generic — use `TData`, `TResponse`, `TRequest`.
- Inline DTO types next to controllers — DTOs belong in `services/dto/` per the folder structure rule.
- Re-typing Prisma enums by hand — let `import { AlarmConditionType } from '@prisma/client'` be the source of truth.