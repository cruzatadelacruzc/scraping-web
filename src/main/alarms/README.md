# Alarm System

## Overview

The alarm system watches scraped product listings and notifies account owners when their configured conditions match. It is multi-tenant — each account's alarms are isolated from every other account.

An alarm is created by selecting a **condition type**, a **product URL**, and setting the condition's **parameters** (thresholds, percentages, etc.). After creation, the alarm engine automatically evaluates it against newly scraped data.

## Available Conditions

Six conditions are implemented, each following the Strategy pattern:

| Condition | What It Detects | Parameters |
|---|---|---|
| **Price Drops Below** | Product price falls below a threshold | `threshold` (decimal) |
| **Price Rises Above** | Product price exceeds a threshold | `threshold` (decimal) |
| **Price Changes by %** | Price change exceeds a percentage | `percentage` (number) |
| **Views Exceed** | View count surpasses a threshold | `threshold` (integer) |
| **Is Outstanding** | Product is marked as outstanding/promoted | None (boolean flag) |
| **Seller Changed** | Product listing changes seller | Internal state tracking |

The seller-changed condition is stateful — it persists the previous seller fingerprint in `alarm.params` and compares on each evaluation.

## Architecture

### Condition Registry (Strategy Pattern)

Each condition is a separate class implementing the `IAlarmCondition` interface:

- `evaluate(product, alarm)` — Returns `true` when the condition matches.
- `buildNotification(alarm, product)` — Constructs the notification title and message.
- `computeParamsUpdate(currentParams, product)` — Optional hook for stateful conditions (used by seller-changed).

The **Condition Registry** maps condition type strings (the `AlarmConditionType` enum) to their strategy implementations. Adding a new condition means creating a new class and registering it — the engine requires no changes.

### Evaluation Engine

The alarm engine runs after each scraping job completes:

1. Newly scraped products are stored in MongoDB.
2. The engine finds all enabled alarms whose `productUrl` matches the scraped URLs — across all accounts.
3. Each alarm is evaluated against its condition strategy.
4. On match: an `AlarmHistory` record is created (for audit) and a `Notification` is inserted (for the user).
5. The alarm's `lastEvaluatedAt`, `lastEvaluatedPrice`, and `lastMatchedAt` timestamps are updated.

**Deduplication**: The engine skips evaluation if an `AlarmHistory` record already exists for that alarm + price combination, preventing duplicate notifications.

### Data Model

```
Account
  └── Alarm (belongs to Account)
        ├── condition, threshold, percentage, params
        ├── enabled flag
        ├── evaluation timestamps
        └── AlarmHistory (one per match)
              ├── productUrl, price
              └── matchedAt
```

Notifications are linked to both the Account and (optionally) the Alarm that triggered them.

## Plan Enforcement

Alarm creation and updates are gated by the account's subscription plan:

- **Alarm limit**: The plan's `maxAlarms` is checked before creating a new alarm. If the account has reached its limit, a `403` is returned.
- **Condition allowlisting**: If the plan restricts which conditions are available, changing an alarm's condition to an unlisted one is rejected.
- **Unlimited plans**: `maxAlarms: -1` bypasses the limit check entirely.

Enforcement is applied on both `create` and `update` operations, preventing bypass via editing an existing alarm.

## Integration with Bots

Users linked through WhatsApp or Telegram can query their alarms using slash commands:

- `/alarms` — Lists all alarms for the linked account with product names and current prices.
- `/subscription` — Shows the current plan name and expiration date.

If the user is not linked to an account, these commands return nothing.

## Lifecycle Integration

- **Account deactivation** pauses all alarms (`enabled = false`). Notifications stop.
- **Account reactivation** re-enables the paused alarms.
- **Account deletion** cascade-deletes all alarms and their history.

## Adding a New Condition

See the alarm-condition skill (`.claude/skills/alarm-condition/SKILL.md`) for the step-by-step recipe. The process follows the Strategy + Registry pattern: create a new condition class, register it in the condition registry, and — in the future — add its metadata to the Alarm Catalog.

## Related Modules

- [Plans & Subscriptions](../users/README.md) — How plans control alarm limits and available conditions.
- [Bot Module](../bots/README.md) — WhatsApp/Telegram slash commands.
