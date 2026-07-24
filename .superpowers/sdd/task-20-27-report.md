# Tasks 20-27 Report: Subscriptions in Account Detail

## Summary

Implemented subscription display and management in the account detail drawer. All 8 tasks completed successfully.

## Files Created (7 new files)

| File | Purpose |
|---|---|
| `apps/admin-web/src/features/accounts/services/account-subscriptions-service.ts` | API client for subscription endpoints (listByAccount, assign, cancel) |
| `apps/admin-web/src/features/accounts/hooks/useGetAccountSubscriptions.ts` | TanStack Query hook to fetch subscriptions for an account |
| `apps/admin-web/src/features/accounts/hooks/useAssignSubscription.ts` | Mutation hook to assign a plan to an account |
| `apps/admin-web/src/features/accounts/hooks/useCancelSubscription.ts` | Mutation hook to cancel a subscription |
| `apps/admin-web/src/features/accounts/components/subscription-section.tsx` | Subscription section component with active sub info, history, actions |
| `apps/admin-web/src/features/accounts/components/plan-selector-dialog.tsx` | Dialog listing available plans for assignment/change |
| `apps/admin-web/src/features/accounts/__tests__/subscription-section.test.tsx` | Unit tests for subscription section |

## Files Modified (8 existing files)

| File | Changes |
|---|---|
| `apps/admin-web/src/features/accounts/components/account-detail-drawer.tsx` | Added `SubscriptionSection` below account details |
| `apps/admin-web/src/features/accounts/components/accounts-table.tsx` | Added "Plan" column with plan name + status badge |
| `apps/admin-web/src/features/accounts/index.ts` | Exported new hooks, service, components |
| `apps/admin-web/src/features/accounts/mappers/account-mapper.ts` | Maps `planName` and `subscriptionStatus` |
| `apps/admin-web/src/features/accounts/services/accounts-service.ts` | Added `planName` and `subscriptionStatus` to `AccountDTO` |
| `apps/admin-web/src/features/accounts/view-models/account-view-model.ts` | Added `planName` and `subscriptionStatus` fields |
| `apps/admin-web/src/shared/i18n/locales/en.json` | Added `accounts.table.plan` key |
| `apps/admin-web/src/shared/i18n/locales/es.json` | Added `accounts.table.plan` key |

## Key Decisions

- Status chip colors: TRIALING=blue, ACTIVE=green, PAST_DUE=amber, CANCELED=red
- Remaining days computed client-side via `date-fns` `differenceInDays`; warning color when < 7 days
- Plan selector reuses `plansService` from the Plans feature
- Cancel requires AlertDialog confirmation
- `useAssignSubscription` mutation is called from within `PlanSelectorDialog`, not from `SubscriptionSection`
- Query keys follow existing patterns: `['accounts', 'subscriptions', accountId]`

## Verification Results

| Check | Result |
|---|---|
| `npm run typecheck -w apps/admin-web` | PASS |
| `npm run lint -w apps/admin-web` | PASS (0 errors, 0 warnings) |
| `npm run test -w apps/admin-web -- --run` | PASS (353 tests, 43 files, all passing) |
| `npm run build -w apps/admin-web` | PASS |

## Commit

```
1259423 feat: add subscription management to account detail
```

---

## Task 27b: Final Review Fixes

### Changes Made

**1. PlanSelectorDialog badge text** — `apps/admin-web/src/features/accounts/components/plan-selector-dialog.tsx`
- Changed badge text from `{t('plans.title')} Current` to `{t('plans.current')}`
- Added `plans.current` i18n key: `"Current"` (en.json) / `"Actual"` (es.json)

**2. PlanSelectorDialog error state** — Same file
- Added `isError`, `error`, `refetch` from `useQuery`
- Renders a red-bordered error card with `AlertCircle` icon, error message, and Retry button with `RotateCcw` icon when the plans query fails
- Empty state and data state now conditionally render only when `!isError`

**3. Export plansService from barrel** — `apps/admin-web/src/features/plans/index.ts`
- Added `export { plansService } from './services/plans-service'`
- Updated import in `plan-selector-dialog.tsx` from `../../plans/services/plans-service` to `@features/plans`

**Additional: Pre-existing lint fixes**
- Fixed `plan-mapper.ts` — removed unnecessary `dto.description ?? dto.type ?? ''` (simplified to `dto.description`)
- Fixed `dropdown-menu.tsx` — removed unnecessary `next !== undefined &&` check in conditional

### Verification

| Check | Result |
|---|---|
| `npm run typecheck -w apps/admin-web` | PASS (0 errors) |
| `npm run lint -w apps/admin-web` | PASS (0 errors, 0 warnings) |

### Commit

```
fix: address final review findings - badge text, error state, barrel export
```
