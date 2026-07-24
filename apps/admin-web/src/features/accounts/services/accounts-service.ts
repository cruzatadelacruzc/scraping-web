import { apiClient } from '@shared/api/client';

export interface AccountDTO {
  id: string;
  name: string;
  userCount: number;
  subscriptionCount: number;
  alarmCount: number;
  createdAt: string;
  updatedAt: string;
  planName?: string;
  subscriptionStatus?: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
}

export interface AccountListResponse {
  accounts: AccountDTO[];
  total: number;
  skip: number;
  limit: number;
}

export const accountsService = {
  list(params: { skip: number; limit: number; search?: string; signal?: AbortSignal }) {
    const { signal, ...queryParams } = params;
    return apiClient.get<AccountListResponse>('/admin/accounts', { params: queryParams, signal });
  },
  getById(id: string) {
    return apiClient.get<AccountDTO>(`/admin/accounts/${id}`);
  },
  delete(id: string) {
    return apiClient.delete(`/admin/accounts/${id}`);
  },
};
