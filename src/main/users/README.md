# Plans & Subscriptions

## Overview

BazaarSentinel uses a plan-based subscription model to control what features each account can access. Every account must have an active subscription to create and manage alarms.

The relationship chain is:

```
Account → Subscription → Plan → Features (JSONB)
```

A **Plan** is a product catalog entry — a template defining limits, capabilities, and pricing. A **Subscription** links an account to a plan for a specific time period.

## The Three Plans

| Plan | Price | Max Alarms | Conditions | AI Alarms | Notification Channels |
|---|---|---|---|---|---|
| **Trial** | Free | 3 | Price Drops, Price Rises, Price Change % | No | In-app only |
| **Standard** | $9.99 | 20 | All six conditions | No | In-app, Email |
| **Unlimited** | $29.99 | Unlimited (-1) | All six conditions | Yes | In-app, Email, Telegram, WhatsApp |

The Trial plan runs for **7 days**. Standard and Unlimited run for **30 days** per billing period.

## Plan Features (JSONB)

Each plan carries a `features` JSONB column that the enforcement layer reads at runtime. The supported keys are:

- `maxAlarms` — Maximum number of alarms an account can create. `-1` means unlimited.
- `allowedConditions` — Array of condition types the plan permits. An empty or missing array means no restrictions (backward-compatible).
- `aiAlarms` — Whether AI-powered alarm conditions are available.
- `notificationChannels` — Which delivery channels the plan includes.

## Subscription Lifecycle

```
TRIALING → ACTIVE → PAST_DUE / CANCELED
```

- **TRIALING** — Automatically assigned on account registration. Lasts 7 days.
- **ACTIVE** — Paid subscription in good standing.
- **PAST_DUE** — Payment missed, subscription beyond its `periodEnd`.
- **CANCELED** — Explicitly terminated.

Only subscriptions with status `ACTIVE` or `TRIALING` are considered active for enforcement purposes. `PAST_DUE` and `CANCELED` subscriptions are ignored.

## Auto-Trial on Registration

When a new account is created, the system automatically assigns a Trial subscription. This is a **fail-open** operation: if the Trial plan does not exist in the database or the subscription creation fails for any reason, the account registration still succeeds. A warning is logged so operators can investigate.

This means accounts are never blocked from registering, even if the plan catalog is misconfigured.

## Plan Enforcement

Before creating or updating an alarm, the system checks:

1. **Alarm limit** — Does the account's active plan allow another alarm? The current alarm count is compared against `features.maxAlarms`.
2. **Condition allowlisting** — Is the requested condition type included in `features.allowedConditions`? If the plan has no allowlist, all conditions are permitted (backward-compatible default).

If either check fails, a `403` error is returned with a message explaining the limitation.

## Account Deactivation & Reactivation

**Deactivation** (soft-delete):
- Sets the user's `deletedAt` timestamp.
- Pauses all alarms (`enabled = false`).
- Revokes all refresh tokens.
- Blacklists the current JWT.
- Reversible within 30 days.

**Reactivation**:
- Clears `deletedAt`.
- Re-enables all alarms that were paused during deactivation.
- The count of re-enabled alarms is logged.

**Hard-delete (purge)**:
- After 30 days of soft-deletion, personal data is permanently removed.
- Alarm and account data is preserved.

## Cascade Deletes

Deleting an account permanently removes all associated data through database-level cascades:

```
Account → Users → UserIdentities, RefreshTokens, PasswordResetTokens, EmailVerificationTokens
Account → Subscriptions
Account → Alarms → AlarmHistory
Account → Notifications
Account → BotLinkCodes, BotLinkAudits, BotConversations
```

Login attempts are preserved (userId set to null) for audit purposes.

## Seeding

Three default plans are seeded idempotently via `prisma/seed.ts`. Running the seed multiple times is safe — existing plans are detected by name and skipped.

## Related Modules

- [Alarm System](../alarms/README.md) — How alarms are evaluated and enforced.
- [Bot Module](../bots/README.md) — WhatsApp/Telegram integration including `/subscription` and `/alarms` slash commands.
