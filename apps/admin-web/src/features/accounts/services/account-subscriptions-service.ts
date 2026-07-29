import { apiClient } from '@shared/api/client';

export interface SubscriptionDTO {
  id: string;
  planId: string;
  planName: string;
  accountId: string;
  status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
  periodStart: string;
  periodEnd: string;
  createdAt: string;
}

export interface AssignSubscriptionDTO {
  accountId: string;
  planId: string;
}

export const accountSubscriptionsService = {
  listByAccount(accountId: string) {
    return apiClient.get<SubscriptionDTO[]>(`/accounts/${accountId}/subscriptions`);
  },
  assign(data: AssignSubscriptionDTO) {
    return apiClient.post<SubscriptionDTO>('/subscriptions', data);
  },
  cancel(subscriptionId: string) {
    return apiClient.delete(`/subscriptions/${subscriptionId}`);
  },
};
