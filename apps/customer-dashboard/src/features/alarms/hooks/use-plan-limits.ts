import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/shared/auth';
import { createQueryPersister } from '@/shared/offline/query-persister';
import type { AlarmCondition, PlanDTO } from '../types';
import { ALL_CONDITIONS } from '../types';
import { planService } from '../services/plan-service';
import { planKeys } from './query-keys';
import { useAlarms } from './use-alarms';

/** Plan limits are read-only and small — worth keeping across an offline reload. */
const persister = createQueryPersister();

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

/** Proactive plan gating: subscription → plan.features + current alarm count. */
export function usePlanLimits(): PlanLimits {
  const session = useAuthStore((s) => s.session);
  const accountId = session?.accountId ?? '';
  const alarmsQuery = useAlarms();

  // Explicit generic: the experimental per-query `persister` breaks queryFn
  // result inference for this hook (union return + early null) and widens
  // `planQuery.data` to `{}` without it.
  const planQuery = useQuery<PlanDTO | null>({
    queryKey: planKeys.limits(accountId),
    enabled: !!accountId,
    staleTime: 10 * 60 * 1000,
    persister,
    queryFn: async ({ signal }): Promise<PlanDTO | null> => {
      const subs = await planService.subscriptions(accountId, signal);
      const active = subs.find((s) => s.status === 'ACTIVE' || s.status === 'TRIALING') ?? null;
      if (!active) return null;
      return planService.plan(active.planId, signal);
    },
  });

  const features = (planQuery.data?.features ?? {}) as PlanFeatures;
  const maxAlarms = typeof features.maxAlarms === 'number' ? features.maxAlarms : null;
  const isUnlimited = maxAlarms === -1;
  const used = alarmsQuery.data?.length ?? 0;
  // Empty/missing allowedConditions = all allowed (backend backward-compat semantics).
  const allowed =
    Array.isArray(features.allowedConditions) && features.allowedConditions.length > 0
      ? (features.allowedConditions.filter((c) =>
          (ALL_CONDITIONS as readonly string[]).includes(c)
        ) as AlarmCondition[])
      : null;

  return {
    maxAlarms,
    allowedConditions: allowed,
    used,
    atLimit: maxAlarms !== null && !isUnlimited && used >= maxAlarms,
    isUnlimited,
    isLoading: planQuery.isLoading || alarmsQuery.isLoading,
  };
}
