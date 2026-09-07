import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/shared/auth';
import { createQueryPersister } from '@/shared/offline/query-persister';
import type { PlanDTO } from '../types';
import { planService } from '../services/plan-service';
import { planKeys } from './query-keys';
import { useAlarms } from './use-alarms';
import { derivePlanLimits, type PlanLimits } from './plan-limits';

export type { PlanLimits } from './plan-limits';

/** Plan limits are read-only and small — worth keeping across an offline reload. */
const persister = createQueryPersister();

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

  return derivePlanLimits(
    planQuery.data ?? null,
    alarmsQuery.data?.length ?? 0,
    planQuery.isLoading || alarmsQuery.isLoading
  );
}
