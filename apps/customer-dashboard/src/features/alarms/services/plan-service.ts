import { apiClient } from '@/shared/api/client';
import { ENDPOINTS } from '@/shared/api/endpoints';
import type { PlanDTO, SubscriptionDTO } from '../types';

export const planService = {
  async subscriptions(accountId: string, signal?: AbortSignal): Promise<SubscriptionDTO[]> {
    const res = await apiClient.get<{ subscriptions: SubscriptionDTO[] }>(
      ENDPOINTS.SUBSCRIPTION.BY_ACCOUNT(accountId),
      { signal },
    );
    return res.data.subscriptions;
  },

  async plan(id: string, signal?: AbortSignal): Promise<PlanDTO> {
    const res = await apiClient.get<{ plan: PlanDTO }>(ENDPOINTS.PLANS.GET(id), { signal });
    return res.data.plan;
  },
};
