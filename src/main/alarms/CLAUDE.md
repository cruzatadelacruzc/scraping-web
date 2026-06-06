---
description: 'Alarm condition system: Strategy + Registry pattern, conditions, flow, and how to add new conditions'
applyTo: 'src/main/alarms/**'
---

# Alarm Condition System

Alarm conditions use a **Strategy + Registry** pattern so that adding a new condition requires zero changes to the engine. Each condition is a standalone class — the engine looks up the condition type in the registry and delegates.

## Architecture

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

## Key Contracts

- **`IAlarmCondition`** — strategy interface: `evaluate()`, `buildNotification()`, optional `computeParamsUpdate()`
- **`ProductSnapshot`** — full product data from scraping pipeline (url, price, views, isOutstanding, seller, location, priceHistory). Each condition reads the fields it needs.
- **`ConditionRegistry`** — injected singleton; `registry.get(type)` returns the strategy. The engine calls it dynamically — no `switch/case`.
- **`Alarm.params`** — JSON column for condition-specific state. `computeParamsUpdate()` persists snapshots (e.g., `SELLER_CHANGED` stores the seller fingerprint).

## Flow

```
ProductService.setupQueueListeners()
  → alarmEngine.evaluateAlarms(ProductSnapshot[])
    → registry.get(alarm.condition).evaluate(product, alarm)
    → if match: AlarmHistory + Notification
    → registry.get(alarm.condition).computeParamsUpdate?() → alarm.params
```

## Adding a New Condition

1. Add value to `AlarmConditionType` Prisma enum → `prisma db push`
2. Create `src/main/alarms/conditions/<name>.condition.ts` implementing `IAlarmCondition`
3. Add Symbol in `types.container.ts`
4. Register in `ConditionRegistry` constructor + bind in `container.ts`
5. Verify: `npx tsc --noEmit` + `npm run test`

The engine is never touched — it resolves the new condition by its type key automatically.
