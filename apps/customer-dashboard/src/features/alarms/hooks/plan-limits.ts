import type { AlarmCondition, PlanDTO } from '../types';
import { ALL_CONDITIONS } from '../types';

interface PlanFeatures {
  maxAlarms?: number;
  allowedConditions?: string[];
}

export interface PlanLimits {
  maxAlarms: number | null;
  allowedConditions: AlarmCondition[] | null;
  used: number;
  atLimit: boolean;
  isUnlimited: boolean;
  isLoading: boolean;
}

/**
 * Derives plan-gating limits from a resolved plan and the current alarm count.
 *
 * Pure — no React, no data fetching. `usePlanLimits` is the hook wrapper that
 * feeds it the query results. Kept separate so the gating logic has a real
 * unit test (hooks that read the zustand auth store can't be `renderHook`-ed
 * in this monorepo — see CLAUDE.md "Conventions").
 *
 * @param plan - The account's active plan, or `null` when there is no active subscription.
 * @param alarmCount - How many alarms the account currently has.
 * @param isLoading - Whether the plan / alarm queries are still loading.
 */
export function derivePlanLimits(
  plan: PlanDTO | null,
  alarmCount: number,
  isLoading: boolean
): PlanLimits {
  const features = (plan?.features ?? {}) as PlanFeatures;
  const maxAlarms = typeof features.maxAlarms === 'number' ? features.maxAlarms : null;
  const isUnlimited = maxAlarms === -1;
  // Empty/missing allowedConditions = all allowed (backend backward-compat semantics).
  const allowedConditions =
    Array.isArray(features.allowedConditions) && features.allowedConditions.length > 0
      ? (features.allowedConditions.filter((c) =>
          (ALL_CONDITIONS as readonly string[]).includes(c)
        ) as AlarmCondition[])
      : null;

  return {
    maxAlarms,
    allowedConditions,
    used: alarmCount,
    atLimit: maxAlarms !== null && !isUnlimited && alarmCount >= maxAlarms,
    isUnlimited,
    isLoading,
  };
}
