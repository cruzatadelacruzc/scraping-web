---
description: 'Step-by-step recipe for adding a new alarm condition to the Strategy+Registry system'
applyTo: 'src/main/alarms/conditions/**'
---

# Alarm Condition — Adding a New Condition

Use this skill when the user asks to add a new alarm condition type. The system uses a **Strategy + Registry** pattern — no `switch/case` to modify. You only create one class, register it, and update the Prisma enum.

## Prerequisites

Read these before starting:
- `src/main/alarms/conditions/condition.interface.ts` — the `IAlarmCondition` interface and `ProductSnapshot`
- `src/main/alarms/conditions/condition-registry.ts` — how conditions are registered
- `src/main/alarms/services/alarm-engine.service.ts` — how the engine delegates to the registry

## Step-by-Step Recipe

### 1. Analyze what product data the condition needs

`ProductSnapshot` provides:
- `url`, `price`, `currency`
- `views`, `isOutstanding`
- `seller` (`{ name?, phone?, email?, whatsapp? }`)
- `location` (`{ state, municipality? }`)
- `priceHistory` (`{ value, updatedAt }[]`)

If the snapshot is missing a field, add it to `ProductSnapshot` in `condition.interface.ts` AND update the mapping in `product.service.ts:setupQueueListeners()`.

### 2. Add the enum value to Prisma

Edit `prisma/schema.prisma` — add the new type to `AlarmConditionType`:
```prisma
enum AlarmConditionType {
  // ... existing
  MY_NEW_CONDITION
}
```

Then sync the DB:
```bash
npx prisma db push
```

### 3. Create the condition class

Create `src/main/alarms/conditions/<kebab-case-name>.condition.ts`:

```typescript
import { Alarm } from '@prisma/client';
import { injectable } from 'inversify';
import { IAlarmCondition, ProductSnapshot } from './condition.interface';

@injectable()
export class MyNewCondition implements IAlarmCondition {
  public readonly type = 'MY_NEW_CONDITION';

  public evaluate(product: ProductSnapshot, alarm: Alarm): boolean {
    // Return true if the condition should fire
    // Read alarm.threshold, alarm.percentage, and/or alarm.params
    return false;
  }

  public buildNotification(alarm: Alarm, product: ProductSnapshot): [string, string] {
    const label = alarm.name || product.url;
    return [
      'Title here',
      `Detail message for "${label}"`,
    ];
  }

  // Optional: only implement if the condition needs to persist state
  public computeParamsUpdate(
    currentParams: Record<string, unknown>,
    product: ProductSnapshot,
  ): Record<string, unknown> | null {
    return { ...currentParams, myKey: 'value' };
  }
}
```

### 4. Add DI symbols

In `src/main/shared/types.container.ts`, add a Symbol:
```typescript
MyNewCondition: Symbol.for('MyNewCondition'),
```

### 5. Register in the container

**Import** in `src/main/shared/container.ts`:
```typescript
import { MyNewCondition } from '@alarms/conditions/<kebab>.condition';
```

**Bind** the class:
```typescript
container.bind(TYPES.MyNewCondition).to(MyNewCondition);
```

**Register** in `ConditionRegistry` — add the parameter to the constructor in `src/main/alarms/conditions/condition-registry.ts`:
```typescript
@inject(TYPES.MyNewCondition) myNewCondition: IAlarmCondition,
```
And add it to the `for` loop array.

### 6. Verify

```bash
npx tsc --noEmit        # must pass with 0 errors from our code
npm run test -- --testPathPattern="unit"  # must not break existing tests
```

### 7. Write unit tests (recommended)

Create `src/__tests__/unit/<kebab>.condition.test.ts`:
- Test `evaluate()` with matching and non-matching data
- Test `buildNotification()` returns expected format
- Mock `alarm` with minimal required fields (`{ threshold, percentage, params, name, productUrl }`)

## Design Rules

1. **Never modify the engine.** `AlarmEngineService` stays untouched. The registry resolves conditions by type key.
2. **Use `alarm.params` for condition-specific state.** Don't add columns to the `Alarm` table for one condition.
3. **Derived values from `ProductSnapshot`.** Don't query DB inside `evaluate()` — all product data must be in the snapshot.
4. **Stateless when possible.** If the condition doesn't need previous state (like `PRICE_DROPS_BELOW`), omit `computeParamsUpdate()`.
5. **Dedup is automatic.** The engine checks `AlarmHistory` by `(alarmId, price)` before calling `buildNotification()`.

## Existing Conditions Reference

| Type | Threshold | Percentage | Params | Has State |
|---|---|---|---|---|
| `PRICE_DROPS_BELOW` | price limit | no | no | no |
| `PRICE_RISES_ABOVE` | price limit | no | no | no |
| `PRICE_CHANGES_BY_PERCENT` | no | change % | no | no |
| `VIEWS_EXCEED` | view count | no | no | no |
| `IS_OUTSTANDING` | no | no | no | no |
| `SELLER_CHANGED` | no | no | `lastSellerFingerprint` | yes |
